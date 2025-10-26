import { Prisma, User } from "@mirlo/prisma/client";
import { Request, Response } from "express";
import { userAuthenticated } from "../../../../auth/passport";
import prisma from "@mirlo/prisma";
import trackGroupProcessor, {
  processSingleTrackGroup,
} from "../../../../utils/trackGroup";
import { merge } from "lodash";
import { isTrackGroup } from "../../../../utils/typeguards";

type Params = {
  userId: string;
};

export default function () {
  const operations = {
    GET: [userAuthenticated, GET],
  };

  async function GET(req: Request, res: Response) {
    const { userId } = req.params as unknown as Params;
    const { trackGroupId } = req.query as unknown as { trackGroupId: string };

    const loggedInUser = req.user as User;
    if (Number(userId) === Number(loggedInUser.id)) {
      const where: Prisma.UserTrackGroupPurchaseWhereInput = {
        userId: Number(userId),
      };
      if (trackGroupId) {
        where.trackGroupId = Number(trackGroupId);
      }
      const tgPurchases = await prisma.userTrackGroupPurchase.findMany({
        where,
        include: {
          trackGroup: {
            include: {
              artist: true,
              cover: true,
              tracks: {
                orderBy: {
                  order: "asc",
                },
              },
            },
          },
          transaction: true,
        },
      });

      const whereTrack: Prisma.UserTrackPurchaseWhereInput = {
        userId: Number(userId),
      };
      if (trackGroupId) {
        whereTrack.track = { trackGroupId: Number(trackGroupId) };
      }

      const trackPurchases = await prisma.userTrackPurchase.findMany({
        where: whereTrack,
        include: {
          track: {
            include: {
              trackGroup: {
                include: {
                  artist: true,
                  cover: true,
                  tracks: {
                    orderBy: {
                      order: "asc",
                    },
                  },
                },
              },
            },
          },
          transaction: true,
        },
      });

      const mappedTG = tgPurchases.map((purchase) => {
        const processedTG = processSingleTrackGroup(purchase.trackGroup);
        return { ...purchase, trackGroup: processedTG };
      });

      const mappedTracks = trackPurchases.map((purchase) => {
        const processedTG = processSingleTrackGroup(purchase.track.trackGroup);
        return {
          ...purchase,
          track: { ...purchase.track, trackGroup: processedTG },
        };
      });

      // combine both lists and sort by transaction created date (newest first)
      const combined = [...mappedTG, ...mappedTracks].sort((a, b) => {
        return (a.transaction?.createdAt ?? 0) > (b.transaction?.createdAt ?? 0)
          ? -1
          : 1;
      });

      res.json({
        results: combined,
      });
    } else {
      res.status(401);
      res.json({
        error: "Invalid route",
      });
    }
  }

  GET.apiDoc = {
    summary: "Returns user's purchased trackgroups",
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
        description: "Trackgroups that belong to the user",
        schema: {
          type: "array",
          items: {
            $ref: "#/definitions/TrackGroupPurchase",
          },
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
