import { NextFunction, Request, Response } from "express";
import { userLoggedInWithoutRedirect } from "../../../../auth/passport";
import prisma from "@mirlo/prisma";
import {
  addSizesToImage,
  findArtistIdForURLSlug,
  processSingleArtist,
} from "../../../../utils/artist";
import {
  finalArtistAvatarBucket,
  finalArtistBackgroundBucket,
  finalCoversBucket,
} from "../../../../utils/minio";
import { whereForPublishedTrackGroups } from "../../../../utils/trackGroup";

export default function () {
  const operations = {
    GET: [userLoggedInWithoutRedirect, GET],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { id }: { id?: string } = req.params;

    try {
      const artistId = await findArtistIdForURLSlug(id);

      const labelProfile = await prisma.artist.findFirst({
        where: { id: artistId, isLabelProfile: true },
        include: {
          background: true,
          avatar: true,
        },
      });

      const label = await prisma.user.findUnique({
        where: { id: labelProfile?.userId, isLabelAccount: true },
        select: {
          name: true,
          id: true,
          currency: true,
          userAvatar: true,
          userBanner: true,
          properties: true,
          artistLabels: {
            where: {
              isArtistApproved: true,
              isLabelApproved: true,
            },
            include: {
              artist: {
                include: {
                  avatar: {
                    where: {
                      deletedAt: null,
                    },
                  },
                  background: {
                    where: {
                      deletedAt: null,
                    },
                  },
                  trackGroups: {
                    where: whereForPublishedTrackGroups(),
                    include: {
                      cover: true,
                      tracks: true,
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
          artistLabels: label?.artistLabels.map((al) => ({
            ...al,
            artist: processSingleArtist(al.artist),
          })),
          profile: labelProfile && processSingleArtist(labelProfile),
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
