import prisma from "@mirlo/prisma";
import { NextFunction, Request, Response } from "express";

import { userLoggedInWithoutRedirect } from "../../../../../auth/passport";
import {
  statAudioSegment,
  getAudioSegmentBuffer,
} from "../../../../../utils/minio";
import { canUserListenToTrack } from "../../../../../utils/ownership";

export const fetchFile = async (
  res: Response,
  filename: string,
  segment: string
) => {
  const { backblazeStat, minioStat } = await statAudioSegment(
    filename,
    segment
  );
  if (!backblazeStat && !minioStat) {
    res.send();
  }
  try {
    const buffer = await getAudioSegmentBuffer(
      filename,
      segment,
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
    const user = req.user;

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
        return;
      }

      if (!segment.includes("playlist.m3u8")) {
        // Segment bytes are identical for every listener and keyed by audio id,
        // so they can be edge-cached publicly. The manifest must stay uncached:
        // it's where auth and the play limit are enforced.
        res.setHeader(
          "Cache-Control",
          "public, max-age=604800, stale-while-revalidate=604800"
        );
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
