import { User } from "@mirlo/prisma/client";
import { NextFunction, Request, Response } from "express";
import { userLoggedInWithoutRedirect } from "../../auth/passport";
import prisma from "@mirlo/prisma";

type Params = {
  userId: string;
};

export default function () {
  const operations = {
    GET: [userLoggedInWithoutRedirect, GET],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { trackIds } = req.query as unknown as { trackIds: string[] };
    try {
      const loggedInUser = req.user as User | undefined;
      const tracks = await prisma.track.findMany({
        where: {
          id: {
            in: trackIds?.map((id) => Number(id)) ?? [],
          },
        },
        include: {
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
            include: {
              artist: true,
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

      const areOwned = tracks.filter((track) => {
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
      });

      res
        .json({
          results: areOwned.map((track) => track.id),
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
