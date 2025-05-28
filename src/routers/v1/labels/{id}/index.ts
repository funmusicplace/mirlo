import { NextFunction, Request, Response } from "express";
import { userLoggedInWithoutRedirect } from "../../../../auth/passport";
import prisma from "@mirlo/prisma";
import { findUserIdForURLSlug } from "../../../../utils/user";
import { addSizesToImage } from "../../../../utils/artist";
import {
  finalArtistAvatarBucket,
  finalArtistBannerBucket,
  finalCoversBucket,
  finalUserAvatarBucket,
} from "../../../../utils/minio";

export default function () {
  const operations = {
    GET: [userLoggedInWithoutRedirect, GET],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { id }: { id?: string } = req.params;

    try {
      const userId = await findUserIdForURLSlug(id);

      const label = await prisma.user.findUnique({
        where: { id: userId, isLabelAccount: true },
        select: {
          name: true,
          id: true,
          currency: true,
          userAvatar: true,
          artistLabels: {
            where: {
              isArtistApproved: true,
              isLabelApproved: true,
            },
            include: {
              artist: {
                include: {
                  avatar: true,
                  banner: true,
                  trackGroups: {
                    include: {
                      cover: true,
                      tracks: true,
                    },
                    where: {
                      paymentToUserId: userId,
                    },
                    orderBy: {
                      releaseDate: "desc",
                    },
                  },
                },
              },
            },
          },
        },
      });
      res.json({
        result: {
          ...label,
          userAvatar: addSizesToImage(finalUserAvatarBucket, label?.userAvatar),
          artistLabels: label?.artistLabels.map((al) => ({
            ...al,
            artist: {
              ...al.artist,
              avatar: addSizesToImage(
                finalArtistAvatarBucket,
                al.artist.avatar
              ),
              banner: addSizesToImage(
                finalArtistBannerBucket,
                al.artist.banner
              ),
              trackGroups: al.artist.trackGroups.map((tg) => ({
                ...tg,
                cover: addSizesToImage(finalCoversBucket, tg.cover),
              })),
            },
          })),
        },
      });
    } catch (e) {
      next(e);
    }
  }

  GET.apiDoc = {
    summary: "Returns label information",
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
        description: "A label that matches the id",
        schema: {
          $ref: "#/definitions/User",
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
