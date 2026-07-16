import prisma from "@mirlo/prisma";
import { NextFunction, Request, Response } from "express";

import { userLoggedInWithoutRedirect } from "../../../../auth/passport";
import { logger } from "../../../../logger";
import { startGeneratingZip } from "../../../../queues/album-queue";
import { zipExists } from "../../../../utils/minio";
import {
  basicTrackGroupInclude,
  FormatOptions,
} from "../../../../utils/trackGroup";

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
        audio: { where: { uploadState: "SUCCESS" } },
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

    logger.info("checking if track is already zipped");
    if (await zipExists("track", track.id, format)) {
      logger.info("there is already a zip for this track");
      return res.json({
        message: "The album has already been generated",
        result: true,
      });
    }
    logger.info("folder for track doesn't exist yet, start generating it");
    const jobId = await startGeneratingZip(
      track.trackGroup,
      [track],
      format,
      "track"
    );
    return res.json({
      message: "We've started generating the folder",
      result: { jobId },
    });
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
