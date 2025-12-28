import { User } from "@mirlo/prisma/client";
import { NextFunction, Request, Response } from "express";
import { logger } from "../../../../logger";
import { userLoggedInWithoutRedirect } from "../../../../auth/passport";
import prisma from "@mirlo/prisma";
import contentDisposition from "content-disposition";

import {
  FormatOptions,
  basicTrackGroupInclude,
  findPurchaseAndVoidToken,
  findPurchaseBasedOnTokenAndUpdate,
} from "../../../../utils/trackGroup";
import {
  getReadStream,
  statFile,
  trackGroupFormatBucket,
} from "../../../../utils/minio";
import { startGeneratingZip } from "../../../../queues/album-queue";
import filenamify from "filenamify";
import { AppError } from "../../../../utils/error";

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
        const user = req.user as User;

        if (!user.isAdmin) {
          const purchase = await findPurchaseAndVoidToken(
            Number(trackGroupId),
            user
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
          `trackGroupId: ${trackGroupId} being downloaded by a non-logged in user, ${email}, ${token}`
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
        const { backblazeStat, minioStat } = await statFile(
          trackGroupFormatBucket,
          zipName
        );
        if (!backblazeStat && !minioStat) {
          logger.info("trackGroup doesn't exist yet, start generating it");
          const jobId = await startGeneratingZip(
            trackGroup,
            trackGroup.tracks,
            format
          );
          return res.json({
            message: "We've started generating the album",
            result: { jobId },
          });
        }
      } catch (e) {
        logger.info("trackGroup doesn't exist yet, start generating it");
        const jobId = await startGeneratingZip(
          trackGroup,
          trackGroup.tracks,
          format
        );
        return res.json({
          message: "We've started generating the album",
          result: { jobId },
        });
      }

      try {
        const originalTitle = `${trackGroup.artist.name} - ${trackGroup.title ?? "album"}`;
        const asciiTitle = filenamify(originalTitle);

        res.setHeader(
          "Content-Disposition",
          contentDisposition(`${asciiTitle}.zip`, { type: "attachment" })
        );

        const stream = await getReadStream(trackGroupFormatBucket, zipName);

        if (stream) {
          stream.pipe(res);
        } else {
          throw new AppError({
            httpCode: 500,
            description: `Remote file not found for ${trackGroupFormatBucket}/${zipName}`,
          });
        }
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
