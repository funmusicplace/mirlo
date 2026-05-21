import prisma from "@mirlo/prisma";
import { NextFunction, Request, Response } from "express";

import { userLoggedInWithoutRedirect } from "../../../../auth/passport";
import { logger } from "../../../../logger";
import { startGeneratingZip } from "../../../../queues/album-queue";
import { statZip } from "../../../../utils/minio";
import {
  basicTrackGroupInclude,
  FormatOptions,
} from "../../../../utils/trackGroup";

export default function () {
  const operations = {
    GET: [userLoggedInWithoutRedirect, GET],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { id: trackGroupId }: { id?: string } = req.params;
    const { format = "flac" } = req.query as {
      format?: FormatOptions;
    };

    const trackGroup = await prisma.trackGroup.findFirst({
      where: {
        id: Number(trackGroupId),
      },
      ...basicTrackGroupInclude,
    });

    if (!trackGroup) {
      res.status(404).json({
        error: "No trackGroup found",
      });
      return next();
    }

    logger.info(`trackGroupId: ${trackGroupId} Found a trackgroup`);

    try {
      logger.info("checking if trackgroup is already zipped");
      // FIXME: Our controller shouldn't have to know about backblaze
      const { backblazeStat, minioStat } = await statZip(
        "trackGroup",
        trackGroup.id,
        format
      );
      if (backblazeStat || minioStat) {
        logger.info("the trackgroup is already zipped");
        return res.json({
          message: "The album has already been generated",
          result: true,
        });
      } else {
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
  }

  GET.apiDoc = {
    summary: "Generates a zipped trackGroup of the given format",
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
