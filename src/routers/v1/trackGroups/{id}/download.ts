import { TrackAudio, Track, User } from "@prisma/client";
import { NextFunction, Request, Response } from "express";
import JSZip from "jszip";
import fs from "fs";
import path from "path";
import { userAuthenticated } from "../../../../auth/passport";
import prisma from "../../../../../prisma/prisma";
import {
  finalAudioBucket,
  getObjectFromMinio,
  minioClient,
} from "../../../../utils/minio";

const { MEDIA_LOCATION } = process.env;

async function buildZipFileForPath(
  tracks: (Track & {
    audio: TrackAudio | null;
  })[]
) {
  var zip = new JSZip();
  await Promise.all(
    tracks.map(async (track, index) => {
      if (track.title && track.audio) {
        const { buffer } = await getObjectFromMinio(
          minioClient,
          finalAudioBucket,
          `${track.audio.id}/original.flac`
        );
        const order = track.order ? track.order : index + 1;
        const trackTitle = `${order} - ${track.title}.flac`;
        zip.file(trackTitle, buffer);
      }
    })
  );

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
