import prisma from "@mirlo/prisma";
import { NextFunction, Request, Response } from "express";

import { assertLoggedIn } from "../../../auth/getLoggedInUser";
import { userAuthenticated } from "../../../auth/passport";
import { AppError } from "../../../utils/error";
import {
  statDownloadableContent,
  getDownloadableContentBufferFromStat,
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
      // FIXME: Remove knowledge of BackBlaze from this location.
      const { backblazeStat } = await statDownloadableContent(contentId);

      if (!backblazeStat) {
        throw new AppError({
          httpCode: 404,
          description: "Content not found",
        });
      }

      res.setHeader(
        "Content-Type",
        backblazeStat?.ContentType || "application/octet-stream"
      );
      res.setHeader("Content-Length", backblazeStat?.ContentLength || 0);
      res.setHeader(
        "Last-Modified",
        backblazeStat?.LastModified?.toUTCString() || new Date().toUTCString()
      );
      res.setHeader("ETag", `"${backblazeStat.ETag}"`);

      try {
        const buffer = await getDownloadableContentBufferFromStat(
          contentId,
          backblazeStat
        );

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
