import { userLoggedInWithoutRedirect } from "../../../../auth/passport";
import { NextFunction, Request, Response } from "express";
import {
  basicTrackGroupInclude,
  FormatOptions,
} from "../../../../utils/trackGroup";
import { logger } from "../../../../logger";
import {
  statFile,
  trackFormatBucket,
  trackGroupFormatBucket,
} from "../../../../utils/minio";
import { startGeneratingZip } from "../../../../queues/album-queue";
import prisma from "@mirlo/prisma";

export default function () {
  const operations = {
    GET: [userLoggedInWithoutRedirect, GET],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { id: trackId }: { id?: string } = req.params;
    const { format = "flac" } = req.query as {
      format?: FormatOptions;
    };

    const track = await prisma.track.findFirst({
      where: {
        id: Number(trackId),
        NOT: {
          audio: null,
        },
      },
      include: {
        audio: true,
        trackGroup: basicTrackGroupInclude,
      },
    });

    if (!track) {
      res.status(404).json({
        error: "No track found",
      });
      return next();
    }

    logger.info(`trackId: ${trackId} Found a track`);

    const zipName = `${track.id}/${format}.zip`;
    logger.info(`zipName: ${zipName}`);

    try {
      logger.info("checking if track is already zipped");
      const { backblazeStat, minioStat } = await statFile(
        trackFormatBucket,
        zipName
      );
      if (backblazeStat || minioStat) {
        logger.info("there is already a zip for this track");
        return res.json({
          message: "The album has already been generated",
          result: true,
        });
      } else {
        logger.info("folder for track doesn't exist yet, start generating it");
        const jobId = await startGeneratingZip(
          track.trackGroup,
          [track],
          format,
          trackFormatBucket
        );
        return res.json({
          message: "We've started generating the album",
          result: { jobId },
        });
      }
    } catch (e) {
      logger.info("folder for track doesn't exist yet, start generating it");
      const jobId = await startGeneratingZip(
        track.trackGroup,
        [track],
        format,
        trackFormatBucket
      );
      return res.json({
        message: "We've started generating the folder",
        result: { jobId },
      });
    }
  }

  GET.apiDoc = {
    summary: "Generates a zipped folder of the given format for the track",
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
        description:
          "A jobId if the zip has not already been generated or true if it exists",
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
