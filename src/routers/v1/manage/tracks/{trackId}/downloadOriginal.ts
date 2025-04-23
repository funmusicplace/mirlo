import { NextFunction, Request, Response } from "express";
import { logger } from "../../../../../logger";
import {
  artistBelongsToLoggedInUser,
  trackBelongsToLoggedInUser,
  userAuthenticated,
} from "../../../../../auth/passport";
import prisma from "@mirlo/prisma";

import {
  FormatOptions,
  basicTrackGroupInclude,
} from "../../../../../utils/trackGroup";
import { finalAudioBucket, getReadStream } from "../../../../../utils/minio";
import filenamify from "filenamify";
import { cleanHeaderValue } from "../../../../../utils/validate-http-headers";
import { AppError } from "../../../../../utils/error";

export default function () {
  const operations = {
    GET: [userAuthenticated, trackBelongsToLoggedInUser, GET],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { trackId }: { trackId?: string } = req.params;

    try {
      const track = await prisma.track.findFirst({
        where: {
          id: Number(trackId),
        },
        include: {
          trackGroup: basicTrackGroupInclude,
          audio: true,
        },
      });

      if (!track || !track.audio) {
        throw new AppError({
          httpCode: 404,
          description: `Track with id ${trackId} not found or doesn't have audio`,
        });
      }

      logger.info(`trackId: ${trackId} Found a track, preparing download`);

      try {
        const title = cleanHeaderValue(
          filenamify(
            `${track.trackGroup.artist.name} - ${track.title ?? "track"}`
          )
        );
        logger.info(`downloading ${title}.zip`);
        res.set(
          "Content-Disposition",
          `attachment; filename="${title}.${track.audio.fileExtension}"`
        );
        res.set("Content-Type", "application/octet-stream");
        res.set("Content-Transfer-Encoding", "binary");
        res.set("Accept-Ranges", "bytes");

        const stream = await getReadStream(
          finalAudioBucket,
          `${track.audio.id}/original.${track.audio.fileExtension}`
        );

        if (stream) {
          stream.pipe(res);
        } else {
          throw new AppError({
            httpCode: 500,
            description: `Remote file not found for ${finalAudioBucket}/${track.audio.id}/original.${track.audio.fileExtension}`,
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
    summary:
      "Downloads the originally uploaded track file if the user has permission",
    parameters: [
      {
        in: "path",
        name: "trackId",
        required: true,
        type: "string",
      },
    ],
    responses: {
      200: {
        description: "The original track file",
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
