import { User } from "@prisma/client";
import { NextFunction, Request, Response } from "express";
import { logger } from "../../../../logger";
import { userLoggedInWithoutRedirect } from "../../../../auth/passport";
import prisma from "../../../../../prisma/prisma";

import { doesTrackGroupBelongToUser } from "../../../../utils/ownership";
import {
  FormatOptions,
  setDownloadTokenToNull,
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
      const trackGroupInclude = {
        include: {
          tracks: {
            include: {
              audio: true,
            },
            where: {
              deletedAt: null,
            },
          },
        },
      };

      let trackGroup;

      if (req.user) {
        const { id: userId, isAdmin } = req.user as User;

        if (!isAdmin) {
          let isCreator;
          try {
            isCreator = await doesTrackGroupBelongToUser(
              Number(trackGroupId),
              userId
            );
          } catch (e) {}
          logger.info(`trackGroupId: ${trackGroupId} isCreator: ${isCreator}`);

          const purchase = await prisma.userTrackGroupPurchase.findFirst({
            where: {
              trackGroupId: Number(trackGroupId),
              ...(!isCreator
                ? {
                    userId: Number(userId),
                    trackGroup: {
                      published: true,
                    },
                  }
                : {}),
            },
            include: {
              trackGroup: trackGroupInclude,
            },
          });

          if (!purchase) {
            logger.info(`trackGroupId: ${trackGroupId} no purchase found `);
            res.status(404);
            return next();
          }
          // TODO: do we want a token to be reset after download?
          // If so we probably want to do this once the download is
          // complete on the client otherwise there might be errors
          // await setDownloadTokenToNull({
          //   userId: purchase.userId,
          //   trackGroupId: purchase.trackGroupId,
          // });
          trackGroup = purchase.trackGroup;
        } else {
          logger.info(
            `trackGroupId: ${trackGroupId} being downloaded by admin`
          );
          trackGroup = await prisma.trackGroup.findFirst({
            where: {
              id: Number(trackGroupId),
            },
            ...trackGroupInclude,
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
          const purchase = await prisma.userTrackGroupPurchase.findFirst({
            where: {
              userId: user.id,
              singleDownloadToken: token,
              trackGroupId: Number(trackGroupId),
              trackGroup: {
                published: true,
              },
            },
            include: {
              trackGroup: trackGroupInclude,
            },
          });

          if (!purchase) {
            logger.info(
              `trackGroupId: ${trackGroupId} no purchase record found `
            );
            res.status(404);
            return next();
          }

          // TODO: do we want a token to be reset after download?
          // If so we probably want to do this once the download is
          // complete on the client otherwise there might be errors
          // await setDownloadTokenToNull({
          //   userId: user?.id,
          //   trackGroupId: Number(trackGroupId),
          // });

          trackGroup = purchase.trackGroup;
        }
      }

      if (!trackGroup) {
        res.status(404).json({
          error: "No trackGroup found",
        });
        return next();
      }
      logger.info("Found a trackgroup");

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
        res.attachment(`${trackGroup.title}.zip`);
        res.set(
          "Content-Disposition",
          `attachment; filename="${trackGroup.title}"`
        );

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
