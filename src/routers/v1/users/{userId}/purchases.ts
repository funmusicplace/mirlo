import { User } from "@mirlo/prisma/client";
import { Request, Response } from "express";
import { userAuthenticated } from "../../../../auth/passport";
import prisma from "@mirlo/prisma";
import trackGroupProcessor from "../../../../utils/trackGroup";
import { processSingleMerch } from "../../../../utils/merch";

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
      const transactions = await prisma.userTransaction.findMany({
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
          merchPurchases: {
            include: {
              merch: {
                include: {
                  artist: true,
                  includePurchaseTrackGroup: true,
                  images: true,
                },
              },
            },
          },
          trackPurchases: {
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
          },
        },
      });

      const mergedPurchases = [...transactions].sort((a, b) => {
        return a.createdAt > b.createdAt ? -1 : 1;
      });

      res.json({
        results: mergedPurchases.map((p) => ({
          ...p,
          trackGroupPurchases: p.trackGroupPurchases?.map((tgp) => ({
            ...tgp,
            trackGroup: trackGroupProcessor.single(tgp.trackGroup, {
              loggedInUserId: loggedInUser.id,
            }),
          })),
          merchPurchases: p.merchPurchases?.map((mp) => ({
            ...mp,
            merch: processSingleMerch(mp.merch),
          })),
          trackPurchases: p.trackPurchases?.map((tp) => ({
            ...tp,
            track: {
              ...tp.track,
              isPlayable: true,
              trackGroup: trackGroupProcessor.single(tp.track.trackGroup, {
                loggedInUserId: loggedInUser.id,
              }),
            },
          })),
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
