import prisma from "@mirlo/prisma";
import { NextFunction, Request, Response } from "express";

import { assertLoggedIn } from "../../../../auth/getLoggedInUser";
import { userOrAppAuthenticated } from "../../../../auth/passport";
import { isAllowedDownloadableContentMimeType } from "../../../../utils/content";
import { clearTrackGroupDownloads } from "../../../../utils/downloadCache";
import { AppError } from "../../../../utils/error";
import { getDownloadableContentUploadUrl } from "../../../../utils/minio";
import {
  doesMerchBelongToUser,
  doesTrackGroupBelongToUser,
} from "../../../../utils/ownership";

// Keep in sync with MAX_DOWNLOADABLE_CONTENT_SIZE on the client.
const MAX_SIZE_MB = 100;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

export default function () {
  const operations = {
    POST: [userOrAppAuthenticated, POST],
  };

  async function POST(req: Request, res: Response, next: NextFunction) {
    assertLoggedIn(req);
    const loggedInUser = req.user;

    const { filename, trackGroupId, merchId, mimeType, size } = req.body;
    try {
      if (!isAllowedDownloadableContentMimeType(mimeType)) {
        throw new AppError({
          httpCode: 400,
          description: `File type "${mimeType}" is not allowed for downloadable content`,
        });
      }

      if (typeof size !== "number" || size <= 0 || size > MAX_SIZE_BYTES) {
        throw new AppError({
          httpCode: 400,
          description: `Downloadable content must be ${MAX_SIZE_MB}MB or smaller`,
        });
      }

      let trackGroup;
      let merch;
      if (trackGroupId) {
        trackGroup = await doesTrackGroupBelongToUser(
          Number(trackGroupId),
          loggedInUser
        );
      }
      if (merchId) {
        merch = await doesMerchBelongToUser(merchId, loggedInUser);
      }

      if (!trackGroup && !merch) {
        res.status(403).json({ error: "You do not own this release or merch" });
        return;
      }

      const downloadableContent = await prisma.downloadableContent.create({
        data: {
          originalFilename: filename,
          mimeType: mimeType,
          size: size,
        },
      });

      if (trackGroup) {
        await prisma.trackGroupDownloadableContent.create({
          data: {
            trackGroupId: trackGroup.id,
            downloadableContentId: downloadableContent.id,
          },
        });
        await clearTrackGroupDownloads(trackGroup.id);
      }
      if (merch) {
        await prisma.merchDownloadableContent.create({
          data: {
            merchId: merch.id,
            downloadableContentId: downloadableContent.id,
          },
        });
      }

      const refreshedContent = await prisma.downloadableContent.findFirst({
        where: { id: downloadableContent.id },
        include: { trackGroups: true, merch: true },
      });

      let uploadUrl = null;
      if (downloadableContent) {
        uploadUrl = await getDownloadableContentUploadUrl(
          downloadableContent.id,
          { contentType: mimeType, contentLength: size }
        );
      }
      res.json({ result: refreshedContent, uploadUrl });
    } catch (e) {
      next(e);
    }
  }

  return operations;
}
