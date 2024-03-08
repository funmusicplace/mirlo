import { User } from "@prisma/client";
import { NextFunction, Request, Response } from "express";
import { logger } from "../../../../logger";
import { userLoggedInWithoutRedirect } from "../../../../auth/passport";
import prisma from "../../../../../prisma/prisma";

import {
  FormatOptions,
  basicTrackGroupInclude,
  findPurchaseAndVoidToken,
  findPurchaseBasedOnTokenAndUpdate,
} from "../../../../utils/trackGroup";
import { minioClient, trackGroupFormatBucket } from "../../../../utils/minio";
import { startGeneratingAlbum } from "../../../../queues/album-queue";

export default function () {
  const operations = {
    GET: [userLoggedInWithoutRedirect, GET],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { id: trackGroupId }: { id?: string } = req.params;
    const {
      email,
      token,
      format = "flac",
    } = req.query as {
      format?: FormatOptions;
      email: string;
      token: string;
    };

    try {
      let trackGroup;

      if (req.user) {
        const { id: userId, isAdmin } = req.user as User;

        if (!isAdmin) {
          const purchase = await findPurchaseAndVoidToken(
            Number(trackGroupId),
            userId
          );

          trackGroup = purchase.trackGroup;
        } else {
          logger.info(
            `trackGroupId: ${trackGroupId} being downloaded by admin`
          );
          trackGroup = await prisma.trackGroup.findFirst({
            where: {
              id: Number(trackGroupId),
            },
            ...basicTrackGroupInclude,
          });
        }
      } else {
        logger.info(
          `trackGroupId: ${trackGroupId} being downloaded by a non-logged in user`
        );
        const user = await prisma.user.findFirst({
          where: { email },
        });

        if (user) {
          trackGroup = await findPurchaseBasedOnTokenAndUpdate(
            Number(trackGroupId),
            token,
            user?.id
          );
        }
      }

      if (!trackGroup) {
        res.status(404).json({
          error: "No trackGroup found",
        });
        return next();
      }

      logger.info(
        `trackGroupId: ${trackGroupId} Found a trackgroup, preparing download`
      );

      const zipName = `${trackGroup.id}/${format}.zip`;

      try {
        logger.info("checking if trackgroup already zipped");
        await minioClient.statObject(trackGroupFormatBucket, zipName);
      } catch (e) {
        const jobId = await startGeneratingAlbum(
          trackGroup,
          format,
          trackGroup.tracks
        );
        return res.json({
          message: "We've started generating the album",
          result: { jobId },
        });
      }

      try {
        const title = trackGroup.title?.replaceAll(".", "-");

        res.attachment(`${title}.zip`);
        res.set("Content-Disposition", `attachment; filename="${title}.zip"`);

        const stream = await minioClient.getObject(
          trackGroupFormatBucket,
          zipName
        );

        stream.pipe(res);
      } catch (e) {
        next(e);
      }

      return;
    } catch (e) {
      next(e);
    }
  }

  GET.apiDoc = {
    summary: "Downloads a trackGroup file if the user has permission",
    parameters: [
      {
        in: "path",
        name: "id",
        required: true,
        type: "string",
      },
    ],
    responses: {
      200: {
        description: "A zip file of trackgroup tracks",
      },
      default: {
        description: "An error occurred",
        schema: {
          additionalProperties: true,
        },
      },
    },
  };

  return operations;
}
