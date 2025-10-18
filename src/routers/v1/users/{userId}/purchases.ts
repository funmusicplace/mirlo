import { User } from "@mirlo/prisma/client";
import { Request, Response } from "express";
import { userAuthenticated } from "../../../../auth/passport";
import prisma from "@mirlo/prisma";
import trackGroupProcessor from "../../../../utils/trackGroup";
import { processSingleMerch } from "../../../../utils/merch";
import {
  isMerchPurchase,
  isTrackGroupPurchase,
  isTrackPurchase,
} from "../../../../utils/typeguards";

type Params = {
  userId: string;
};

export default function () {
  const operations = {
    GET: [userAuthenticated, GET],
  };

  async function GET(req: Request, res: Response) {
    const { userId } = req.params as unknown as Params;

    const loggedInUser = req.user as User;
    if (Number(userId) === Number(loggedInUser.id)) {
      const trackGroupPurchases = await prisma.userTransaction.findMany({
        where: {
          userId: Number(userId),
        },
        include: {
          trackGroupPurchases: {
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
        },
      });

      const merchPurchases = await prisma.merchPurchase.findMany({
        where: {
          userId: Number(userId),
        },
        include: {
          merch: {
            include: {
              artist: true,
              includePurchaseTrackGroup: true,
              images: true,
            },
          },
        },
      });

      const trackPurchases = await prisma.userTrackPurchase.findMany({
        where: {
          userId: Number(userId),
        },
        include: {
          track: {
            include: {
              trackGroup: {
                include: {
                  artist: true,
                  cover: true,
                },
              },
            },
          },
        },
      });

      const mergedPurchases = [
        ...merchPurchases,
        ...trackGroupPurchases,
        ...trackPurchases,
      ].sort((a, b) => {
        const timeA = isTrackPurchase(a) ? a.datePurchased : a.createdAt;
        const timeB = isTrackPurchase(b) ? b.datePurchased : b.createdAt;
        return timeA > timeB ? -1 : 1;
      });

      res.json({
        results: mergedPurchases.map((p) => ({
          ...p,
          trackGroup:
            isTrackGroupPurchase(p) && trackGroupProcessor.single(p.trackGroup),
          merch: isMerchPurchase(p) && processSingleMerch(p.merch),
          ...(isTrackPurchase(p)
            ? {
                track: {
                  ...p.track,
                  trackGroup: trackGroupProcessor.single(p.track.trackGroup),
                },
                trackGroup: trackGroupProcessor.single(p.track.trackGroup),
              }
            : {}),
        })),
      });
    } else {
      res.status(401);
      res.json({
        error: "Invalid route",
      });
    }
  }

  GET.apiDoc = {
    summary:
      "Returns user's purchases, combination of merch and digital purchases",
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
