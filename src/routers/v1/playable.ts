import { User } from "@mirlo/prisma/client";
import { NextFunction, Request, Response } from "express";
import { userLoggedInWithoutRedirect } from "../../auth/passport";
import prisma from "@mirlo/prisma";

export default function () {
  const operations = {
    GET: [userLoggedInWithoutRedirect, GET],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { trackIds } = req.query as unknown as { trackIds: string[] };
    try {
      if (!trackIds || trackIds.length === 0) {
        return res.status(200).json({ results: [] });
      }
      const loggedInUser = req.user as User | undefined;
      const tracks = await prisma.track.findMany({
        where: {
          id: {
            in: trackIds?.map((id) => Number(id)) ?? [],
          },
          deletedAt: null,
        },
        select: {
          id: true,
          isPreview: true,
          ...(loggedInUser
            ? {
                userTrackPurchases: {
                  where: {
                    userId: Number(loggedInUser.id),
                  },
                },
              }
            : {}),
          trackGroup: {
            select: {
              artist: {
                select: {
                  userId: true,
                },
              },
              ...(loggedInUser
                ? {
                    userTrackGroupPurchases: {
                      where: {
                        userId: Number(loggedInUser.id),
                      },
                    },
                  }
                : {}),
            },
          },
        },
      });

      const areOwned = trackIds.filter((id) => {
        const track = tracks.find((t) => t.id === Number(id));
        if (track) {
          const hasPurchasedTrack =
            track.userTrackPurchases && track.userTrackPurchases.length > 0;
          const hasPurchasedTrackGroup =
            track.trackGroup.userTrackGroupPurchases &&
            track.trackGroup.userTrackGroupPurchases.length > 0;
          const isArtistOwner =
            track.trackGroup.artist.userId === loggedInUser?.id;

          return (
            hasPurchasedTrack ||
            hasPurchasedTrackGroup ||
            isArtistOwner ||
            track.isPreview
          );
        }
        return false;
      });

      res
        .json({
          results: areOwned.map(Number),
        })
        .status(200);
    } catch (e) {
      next(e);
    }
  }

  GET.apiDoc = {
    summary:
      "Returns tracks that are playable by the user from the list provided",
    responses: {
      200: {
        description: "Track ids that are playable by the user",
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
