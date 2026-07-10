import prisma from "@mirlo/prisma";
import { Request, Response } from "express";

import { assertLoggedIn } from "../../../../auth/getLoggedInUser";
import { userAuthenticated } from "../../../../auth/passport";
import { serializeMerch } from "../../../../serializers/merch";
import {
  processSingleTrackGroup,
  serializeTrackGroupPurchase,
} from "../../../../serializers/trackGroup";
import { serializeUserTransaction } from "../../../../serializers/userTransaction";

type Params = {
  userId: string;
};

export default function () {
  const operations = {
    GET: [userAuthenticated, GET],
  };

  async function GET(req: Request, res: Response) {
    const { userId } = req.params as unknown as Params;

    assertLoggedIn(req);
    const loggedInUser = req.user;
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
                  profile: true,
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
                  profile: {
                    include: { user: { select: { currency: true } } },
                  },
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
                      profile: true,
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

      const results = mergedPurchases.map((p) => ({
        ...p,
        trackGroupPurchases: p.trackGroupPurchases?.map((tgp) =>
          serializeTrackGroupPurchase(tgp, {
            loggedInUserId: loggedInUser.id,
          })
        ),
        merchPurchases: p.merchPurchases?.map((mp) => ({
          ...mp,
          merch: serializeMerch(mp.merch),
        })),
        trackPurchases: p.trackPurchases?.map((tp) => ({
          ...tp,
          track: {
            ...tp.track,
            isPlayable: true,
            trackGroup: processSingleTrackGroup(tp.track.trackGroup, {
              loggedInUserId: loggedInUser.id,
            }),
          },
        })),
      }));
      const apiResults = results.map((p) => serializeUserTransaction(p));
      res.json({ results: apiResults });
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
