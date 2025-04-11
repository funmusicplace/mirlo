import { Prisma, User } from "@mirlo/prisma/client";
import { NextFunction, Request, Response } from "express";
import { userAuthenticated } from "../../../../auth/passport";
import prisma from "@mirlo/prisma";
import trackGroupProcessor from "../../../../utils/trackGroup";
import { AppError } from "../../../../utils/error";

type Params = {
  userId: string;
};

export default function () {
  const operations = {
    GET: [userAuthenticated, GET],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { userId } = req.params as unknown as Params;
    const { trackIds } = req.query as unknown as { trackIds: string[] };
    try {
      const loggedInUser = req.user as User;
      if (Number(userId) === Number(loggedInUser.id)) {
        const tracks = await prisma.track.findMany({
          where: {
            id: {
              in: trackIds.map((id) => Number(id)),
            },
          },
          include: {
            userTrackPurchases: {
              where: {
                userId: Number(userId),
              },
            },
            trackGroup: {
              include: {
                artist: true,
                userTrackGroupPurchases: {
                  where: {
                    userId: Number(userId),
                  },
                },
              },
            },
          },
        });

        const areOwned = tracks.filter((track) => {
          const userTrackPurchases = track.userTrackPurchases;
          const userTrackGroupPurchases =
            track.trackGroup.userTrackGroupPurchases;
          return (
            (userTrackPurchases && userTrackPurchases.length > 0) ||
            (userTrackGroupPurchases && userTrackGroupPurchases.length > 0) ||
            track.trackGroup.artist.userId === loggedInUser.id ||
            track.isPreview
          );
        });

        res
          .json({
            results: areOwned.map((track) => track.id),
          })
          .status(200);
      } else {
        res.status(401);
        res.json({
          error: "Invalid route",
        });
      }
    } catch (e) {
      next(e);
    }
  }

  GET.apiDoc = {
    summary:
      "Returns tracks that are playable by the user from the list provided",
    parameters: [
      {
        in: "path",
        name: "userId",
        required: true,
        type: "string",
      },
    ],
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
