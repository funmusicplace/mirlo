import { NextFunction, Request, Response } from "express";
import { Post, User } from "@prisma/client";

import trackGroupProcessor from "../../../../utils/trackGroup";
import postProcessor from "../../../../utils/post";

import prisma from "../../../../../prisma/prisma";
import { userLoggedInWithoutRedirect } from "../../../../auth/passport";
import {
  checkIsUserSubscriber,
  findArtistIdForURLSlug,
} from "../../../../utils/artist";
import {
  finalArtistAvatarBucket,
  finalArtistBannerBucket,
} from "../../../../utils/minio";
import { convertURLArrayToSizes } from "../../../../utils/images";
import { isNumber } from "lodash";

export default function () {
  const operations = {
    GET: [userLoggedInWithoutRedirect, GET],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    let { id }: { id?: string } = req.params;
    const user = req.user as User;
    if (!id || id === "undefined") {
      return res.status(400);
    }
    try {
      const parsedId = await findArtistIdForURLSlug(id);
      let isUserSubscriber = false;
      let artist: any;
      if (parsedId) {
        artist = await prisma.artist.findFirst({
          where: {
            id: parsedId,
            enabled: true,
          },
          include: {
            trackGroups: {
              where: {
                published: true,
                tracks: { some: { audio: { uploadState: "SUCCESS" } } },
              },
              include: {
                tracks: {
                  where: { deletedAt: null },
                },
                cover: true,
              },
            },
            banner: true,
            avatar: true,
            subscriptionTiers: {
              where: {
                deletedAt: null,
              },
            },
            posts: {
              where: {
                publishedAt: {
                  lte: new Date(),
                },
                deletedAt: null,
              },
            },
          },
        });
        isUserSubscriber = await checkIsUserSubscriber(user, parsedId);
      }

      if (!artist) {
        res.status(404);
        return next();
      }

      res.json({
        result: {
          ...artist,
          posts: artist?.posts.map((p: Post) =>
            postProcessor.single(
              p,
              isUserSubscriber || artist.userId === user?.id
            )
          ),
          banner: {
            ...artist?.banner,
            sizes:
              artist?.banner &&
              convertURLArrayToSizes(
                artist?.banner?.url,
                finalArtistBannerBucket
              ),
          },
          avatar: {
            ...artist?.avatar,
            sizes:
              artist?.avatar &&
              convertURLArrayToSizes(
                artist?.avatar?.url,
                finalArtistAvatarBucket
              ),
          },
          trackGroups: artist?.trackGroups.map(trackGroupProcessor.single),
        },
      });
    } catch (e) {
      console.error(`artist/${id}`, e);
      res.status(500);
    }
  }

  GET.apiDoc = {
    summary: "Returns Artist information",
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
        description: "An artist that matches the id",
        schema: {
          $ref: "#/definitions/Artist",
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
