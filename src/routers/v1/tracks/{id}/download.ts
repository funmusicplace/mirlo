import { User } from "@mirlo/prisma/client";
import { NextFunction, Request, Response } from "express";
import { logger } from "../../../../logger";
import { userLoggedInWithoutRedirect } from "../../../../auth/passport";
import prisma from "@mirlo/prisma";

import {
  FormatOptions,
  basicTrackGroupInclude,
  findTrackPurchaseAndVoidToken,
  findTrackPurchaseBasedOnTokenAndUpdate,
} from "../../../../utils/trackGroup";
import {
  getReadStream,
  statFile,
  trackFormatBucket,
  trackGroupFormatBucket,
} from "../../../../utils/minio";
import { startGeneratingZip } from "../../../../queues/album-queue";
import filenamify from "filenamify";
import { cleanHeaderValue } from "../../../../utils/validate-http-headers";
import { AppError } from "../../../../utils/error";

export default function () {
  const operations = {
    GET: [userLoggedInWithoutRedirect, GET],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { id: trackId }: { id?: string } = req.params;
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
      let track;

      if (req.user) {
        const user = req.user as User;

        if (!user.isAdmin) {
          const purchase = await findTrackPurchaseAndVoidToken(
            Number(trackId),
            user
          );

          track = purchase.track;
        } else {
          logger.info(`trackId: ${trackId} being downloaded by admin`);
          track = await prisma.track.findFirst({
            where: {
              id: Number(trackId),
            },
            include: {
              trackGroup: basicTrackGroupInclude,
            },
          });
        }
      } else {
        logger.info(
          `trackId: ${trackId} being downloaded by a non-logged in user, ${email}, ${token}`
        );
        const user = await prisma.user.findFirst({
          where: { email },
        });

        if (user) {
          track = await findTrackPurchaseBasedOnTokenAndUpdate(
            Number(trackId),
            token,
            user?.id
          );
        }
      }

      if (!track) {
        res.status(404).json({
          error: "No track found",
        });
        return next();
      }

      logger.info(`trackId: ${trackId} Found a track, preparing download`);

      const zipName = `${track.id}/${format}.zip`;

      try {
        logger.info("checking if track already zipped");
        const { backblazeStat, minioStat } = await statFile(
          trackFormatBucket,
          zipName
        );
        if (!backblazeStat && !minioStat) {
          logger.info("Track not zipped");
          throw new AppError({
            httpCode: 400,
            description: "Need to generate track folder first",
          });
        }
      } catch (e) {
        throw new AppError({
          httpCode: 400,
          description: "Need to generate track folder first",
        });
      }

      try {
        const title = cleanHeaderValue(
          filenamify(
            `${track.trackGroup.artist.name} - ${track.title ?? "track"}`
          )
        );
        logger.info(`downloading ${title}.zip`);
        res.attachment(`${title}.zip`);
        res.set("Content-Disposition", `attachment; filename="${title}.zip"`);

        const stream = await getReadStream(trackFormatBucket, zipName);

        if (stream) {
          stream.pipe(res);
        } else {
          throw new AppError({
            httpCode: 500,
            description: `Remote file not found for ${trackFormatBucket}/${zipName}`,
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
