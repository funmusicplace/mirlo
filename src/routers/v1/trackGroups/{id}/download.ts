import { TrackAudio, Track, User } from "@prisma/client";
import { NextFunction, Request, Response } from "express";
import JSZip from "jszip";
import { logger } from "../../../../logger";

import { userAuthenticated } from "../../../../auth/passport";
import prisma from "../../../../../prisma/prisma";
import {
  finalAudioBucket,
  getObjectFromMinio,
  minioClient,
} from "../../../../utils/minio";

async function buildZipFileForPath(
  tracks: (Track & {
    audio: TrackAudio | null;
  })[]
) {
  var zip = new JSZip();
  for (let i = 0; i < tracks.length; i++) {
    const track = tracks[i];
    if (track.title && track.audio) {
      logger.info(`Fetching file for tracks ${track.title}`);
      const { buffer } = await getObjectFromMinio(
        minioClient,
        finalAudioBucket,
        `${track.audio.id}/original.${track.audio.fileExtension}`,
        logger
      );
      logger.info(`Fetched file for tracks ${track.title}`);
      const order = track.order ? track.order : i + 1;
      const trackTitle = `${order} - ${track.title}.${track.audio.fileExtension}`;
      zip.file(trackTitle, buffer);
      logger.info(`Added track to zip file ${track.title}`);
    }
  }
  logger.info("Done building zip");

  return zip.generateAsync({ type: "base64" });
}

export default function () {
  const operations = {
    GET: [userAuthenticated, GET],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { id: trackGroupId }: { id?: string } = req.params;
    const { id: userId } = req.user as User;

    try {
      const purchase = await prisma.userTrackGroupPurchase.findFirst({
        where: {
          trackGroupId: Number(trackGroupId),
          userId: Number(userId),
          trackGroup: {
            published: true,
          },
        },
        include: {
          trackGroup: {
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
          },
        },
      });

      if (!purchase) {
        res.status(404);
        return next();
      }
      const zip = await buildZipFileForPath(
        // FIXME: why is this being picky about typing?
        purchase.trackGroup.tracks as unknown as (Track & {
          audio: TrackAudio | null;
        })[]
      );
      res.send(zip);
    } catch (e) {
      console.error("trackGroups/{id}/download", e);
      res.status(500);
      res.send({
        error: "Error downloading trackGroup",
      });
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
