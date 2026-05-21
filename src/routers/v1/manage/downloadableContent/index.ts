import prisma from "@mirlo/prisma";
import { NextFunction, Request, Response } from "express";

import { assertLoggedIn } from "../../../../auth/getLoggedInUser";
import { userAuthenticated } from "../../../../auth/passport";
import { AppError } from "../../../../utils/error";
import { getDownloadableContentUploadUrl } from "../../../../utils/minio";
import {
  doesMerchBelongToUser,
  doesTrackGroupBelongToUser,
} from "../../../../utils/ownership";

// Keep in sync with DOWNLOADABLE_CONTENT_MIME_TYPES on the client.
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "text/plain",
  "text/markdown",
  "application/epub+zip",
];

const isAllowedMimeType = (mimeType?: string): boolean =>
  !!mimeType &&
  (ALLOWED_MIME_TYPES.includes(mimeType) || mimeType.startsWith("image/"));

// Keep in sync with MAX_DOWNLOADABLE_CONTENT_SIZE on the client.
const MAX_SIZE_MB = 100;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

export default function () {
  const operations = {
    POST: [userAuthenticated, POST],
  };

  async function POST(req: Request, res: Response, next: NextFunction) {
    assertLoggedIn(req);
    const loggedInUser = req.user;

    const { filename, trackGroupId, merchId, mimeType, size } = req.body;
    try {
      if (!isAllowedMimeType(mimeType)) {
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
          downloadableContent.id
        );
      }
      res.json({ result: refreshedContent, uploadUrl });
    } catch (e) {
      next(e);
    }
  }

  return operations;
}
