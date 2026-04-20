import { NextFunction, Request, Response } from "express";

import { userAuthenticated } from "../../../../auth/passport";
import { assertLoggedIn } from "../../../../auth/getLoggedInUser";
import prisma from "@mirlo/prisma";
import {
  doesMerchBelongToUser,
  doesTrackGroupBelongToUser,
} from "../../../../utils/ownership";
import {
  downloadableContentBucket,
  getPresignedUploadUrl,
} from "../../../../utils/minio";

export default function () {
  const operations = {
    POST: [userAuthenticated, POST],
  };

  async function POST(req: Request, res: Response, next: NextFunction) {
    assertLoggedIn(req);
    const loggedInUser = req.user;

    const { filename, trackGroupId, merchId, mimeType } = req.body;
    try {
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
        uploadUrl = await getPresignedUploadUrl(
          downloadableContentBucket,
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
