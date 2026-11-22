import prisma from "@mirlo/prisma";
import { NextFunction, Request, Response } from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";

import { isEmbeddedOnAnotherSite } from "../../../../../auth/firstParty";
import { userLoggedInWithoutRedirect } from "../../../../../auth/passport";
import { AppError, HttpCode } from "../../../../../utils/error";
import { canUserListenToTrack } from "../../../../../utils/ownership";
import { getAudioSegmentBufferIfExists } from "../../../../../utils/storage";
import { whereForTrackGroupVisibleTo } from "../../../../../utils/trackGroup";

const STREAM_FILE = /^(playlist\.m3u8|segment-\d+\.ts)$/;

export const fetchFile = async (
  res: Response,
  filename: string,
  segment: string
) => {
  if (!STREAM_FILE.test(segment)) {
    res.status(404).send();
    return;
  }
  try {
    const buffer = await getAudioSegmentBufferIfExists(filename, segment);
    if (buffer === undefined) {
      res.send();
      return;
    }
    res.end(buffer, "binary");
  } catch (e) {
    console.error("error", e);
    res.status(400);
    res.send();
  }
};

const isDev = process.env.NODE_ENV === "development";

const playlistLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => isDev || req.params.segment !== "playlist.m3u8",
  keyGenerator: (req) =>
    req.user ? `user:${req.user.id}` : ipKeyGenerator(req.ip ?? ""),
  handler: (_req, _res, next) =>
    next(
      new AppError({
        httpCode: HttpCode.TOO_MANY_REQUESTS,
        description: "Too many tracks started, please try again later",
      })
    ),
});

export default function () {
  const operations = {
    GET: [userLoggedInWithoutRedirect, playlistLimiter, GET],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { id, segment }: { id?: string; segment?: string } = req.params;
    const user = req.user;

    if (segment.includes("playlist.m3u8") && isEmbeddedOnAnotherSite(req)) {
      return next(
        new AppError({
          httpCode: HttpCode.FORBIDDEN,
          description:
            "Streaming is only available on Mirlo or in apps approved by this instance",
        })
      );
    }

    try {
      const track = await prisma.track.findFirst({
        where: {
          id: Number(id),
          trackGroup: whereForTrackGroupVisibleTo(user),
        },
        include: {
          trackGroup: {
            include: {
              profile: true,
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
      402: {
        description: "The free play limit for this track is used up",
      },
      403: {
        description:
          "The playlist was requested from another site without an approved client's mirlo-api-key or OAuth token",
      },
      429: {
        description:
          "Too many playlists started in 10 minutes, per user when logged in, otherwise per IP",
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
