import prisma from "@mirlo/prisma";
import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

import { MIRLO_API_KEY_HEADER } from "../../../../../../auth/apiKey";
import { userLoggedInWithoutRedirect } from "../../../../../../auth/passport";
import logger from "../../../../../../logger";
import { canUserListenToTrack } from "../../../../../../utils/ownership";
import socialMusic from "../../../../../../utils/socialMusic";
import { fetchFile } from "../{segment}";

const jwt_secret = process.env.JWT_SECRET ?? "secretkey";

export default function () {
  const operations = {
    GET: [userLoggedInWithoutRedirect, GET],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { id, segment }: { id?: string; segment?: string } = req.params;
    const user = req.user;
    // @ts-ignore - req.logger added by middleware
    const log = req.logger || logger;

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

      const isManifest = segment.includes("playlist.m3u8");
      if (isManifest && isUserAbleToListenToTrack === "exceeded") {
        res.status(402).send("Track play limit exceeded");
        return next();
      }

      if (track.audio) {
        const userid = req.get(socialMusic.HEADER_USERID);
        log.debug("Streaming remote", {
          segment,
          client: req.client?.applicationName,
        });

        if (isManifest) {
          // On manifest request,
          // - verify that the client is legit
          // - generate a playtoken for a song and user
          const apiHeader = req.headers[MIRLO_API_KEY_HEADER];

          if (!Boolean(apiHeader) || req.client?.key !== apiHeader) {
            res
              .status(401)
              .send(`Header ${MIRLO_API_KEY_HEADER} missing or invalid`);
            return next();
          }

          if (!userid) {
            res.status(400).send(`Header ${socialMusic.HEADER_USERID} missing`);
            return next();
          }

          const payload = { song: id, userid };
          if (userid) {
            log.debug("Generate playtoken:", payload);
            const playToken = jwt.sign(payload, jwt_secret, {
              expiresIn: "4w",
            });
            res.setHeader(socialMusic.HEADER_PLAYTOKEN, playToken);
          }
        } else {
          // On a segment request, check that the token matches user and song

          const playToken = req.query[socialMusic.PLAYTOKEN];
          const reqUserId = req.query[socialMusic.USERID];
          if (!(playToken && reqUserId)) {
            res
              .status(401)
              .send(
                `${socialMusic.USERID} or ${socialMusic.PLAYTOKEN} missing`
              );
            return next();
          }

          // @ts-ignore playtoken type may not be a string?
          const decoded = jwt.verify(playToken, jwt_secret);
          const { song, userid } = decoded;

          log.debug("Matching token to request", {
            token: { song, userid },
            request: { song: id, user: reqUserId },
          });

          if (song !== id || reqUserId !== userid) {
            log.debug("Credentials error");
            res.status(403).send("Token doesn't match song and user");
            return next();
          } else {
            log.debug("Credentials match");
          }
        }

        await fetchFile(res, track.audio.id, segment);
      }
    } catch (e) {
      console.error(e);
      res.status(500);
      return next();
    }
  }

  GET.apiDoc = {
    summary: "With the right authorization, returns track streaming playlist",
    parameters: [
      {
        in: "path",
        name: "id",
        required: true,
        type: "string",
      },
      { in: "query", name: socialMusic.USERID, type: "string" },
      { in: "query", name: socialMusic.PLAYTOKEN, type: "string" },
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
