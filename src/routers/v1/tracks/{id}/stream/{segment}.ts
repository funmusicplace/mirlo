import { User } from "@mirlo/prisma/client";
import { NextFunction, Request, Response } from "express";

import prisma from "@mirlo/prisma";
import {
  finalAudioBucket,
  getBufferBasedOnStat,
  statFile,
} from "../../../../../utils/minio";
import { userLoggedInWithoutRedirect } from "../../../../../auth/passport";
import { canUserListenToTrack } from "../../../../../utils/ownership";

export const fetchFile = async (
  res: Response,
  filename: string,
  segment: string
) => {
  const alias = `${filename}/${segment}`;

  const { backblazeStat, minioStat } = await statFile(finalAudioBucket, alias);
  if (!backblazeStat && !minioStat) {
    res.send();
  }
  try {
    const buffer = await getBufferBasedOnStat(
      finalAudioBucket,
      alias,
      backblazeStat
    );

    res.end(buffer, "binary");
  } catch (e) {
    console.error("error", e);
    res.status(400);
    res.send();
    return;
  }
};

export default function () {
  const operations = {
    GET: [userLoggedInWithoutRedirect, GET],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { id, segment }: { id?: string; segment?: string } = req.params;
    const user = req.user as User | undefined;

    try {
      const track = await prisma.track.findUnique({
        where: { id: Number(id) },
        include: {
          trackGroup: {
            include: {
              artist: true,
            },
          },
          audio: true,
        },
      });

      const isUserAbleToListenToTrack = await canUserListenToTrack(
        track?.id,
        user,
        req.ip
      );

      if (!track || !isUserAbleToListenToTrack) {
        res.status(404);
        return next();
      }

      if (
        segment.includes("playlist.m3u8") &&
        isUserAbleToListenToTrack === "exceeded"
      ) {
        res.status(402).send("Track play limit exceeded");
      }

      if (track.audio) {
        await fetchFile(res, track.audio.id, segment);
      }
    } catch (e) {
      console.error(e);
      res.status(500);
      return next();
    }
  }

  GET.apiDoc = {
    summary: "Returns track streaming playlist",
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
        description: "A track that matches the id",
        schema: {
          $ref: "#/definitions/Track",
        },
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
