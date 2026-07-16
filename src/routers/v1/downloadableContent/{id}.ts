import prisma from "@mirlo/prisma";
import { NextFunction, Request, Response } from "express";

import { assertLoggedIn } from "../../../auth/getLoggedInUser";
import { userAuthenticated } from "../../../auth/passport";
import { AppError } from "../../../utils/error";
import {
  getDownloadableContentMeta,
  getDownloadableContentBuffer,
} from "../../../utils/minio";

type Params = {
  id: string;
};

export default function () {
  const operations = {
    GET: [userAuthenticated, GET],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { id: contentId } = req.params as unknown as Params;
    assertLoggedIn(req);
    const loggedInUser = req.user;

    try {
      const hasUserBoughtMerch = await prisma.merchPurchase.findFirst({
        where: {
          userId: loggedInUser?.id,
          merch: {
            downloadableContent: {
              some: {
                downloadableContentId: contentId,
              },
            },
          },
        },
      });

      if (!hasUserBoughtMerch && !loggedInUser.isAdmin) {
        throw new AppError({
          httpCode: 403,
          description: "You do not have access to this content",
        });
      }
      const meta = await getDownloadableContentMeta(contentId);

      if (!meta) {
        throw new AppError({
          httpCode: 404,
          description: "Content not found",
        });
      }

      res.setHeader(
        "Content-Type",
        meta.contentType || "application/octet-stream"
      );
      res.setHeader("Content-Length", meta.contentLength || 0);
      res.setHeader(
        "Last-Modified",
        meta.lastModified?.toUTCString() || new Date().toUTCString()
      );
      res.setHeader("ETag", `"${meta.etag}"`);

      try {
        const { buffer } = await getDownloadableContentBuffer(contentId);

        res.end(buffer, "binary");

        return;
      } catch (e) {
        console.error("error", e);
        res.status(400);
      }
    } catch (e) {
      next(e);
    }
  }

  return operations;
}
