import { TrackAudio, Track, User } from "@prisma/client";
import { NextFunction, Request, Response } from "express";
import JSZip from "jszip";
import fs from "fs";
import path from "path";
import { userAuthenticated } from "../../../../auth/passport";
import prisma from "../../../../../prisma/prisma";

const { MEDIA_LOCATION } = process.env;

async function buildZipFileForPath(
  tracks: (Track & {
    audio: TrackAudio | null;
  })[]
) {
  var zip = new JSZip();
  tracks.forEach((track) => {
    if (track.title && track.audio) {
      // FIXME: needs to be built by minio
      const location = path.join(
        MEDIA_LOCATION ?? "",
        "audio",
        `${track.audio.id}/original.flac`
      );
      if (fs.statSync(location).isFile()) {
      }
      zip.file(`${track.title}.flac`, fs.readFileSync(location));
    }
  });
  return zip.generateAsync({ type: "base64" });
}

export default function () {
  const operations = {
    GET: [userAuthenticated, GET],
  };

  // FIXME: only do published tracks
  async function GET(req: Request, res: Response, next: NextFunction) {
    const { id: trackGroupId }: { id?: string } = req.params;
    const { id: userId } = req.user as User;

    try {
      const purchase = await prisma.userTrackGroupPurchase.findFirst({
        where: { trackGroupId: Number(trackGroupId), userId: Number(userId) },
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
