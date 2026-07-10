import prisma from "@mirlo/prisma";
import { Request, Response } from "express";

import { assertLoggedIn } from "../../../../auth/getLoggedInUser";
import { userAuthenticated } from "../../../../auth/passport";
import { processSingleArtist } from "../../../../utils/artist";
import { serializeProfileUserSubscriptionCharge } from "../../../../serializers/profileUserSubscription";

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
      const charges = await prisma.profileUserSubscriptionCharge.findMany({
        where: {
          profileUserSubscription: {
            userId: Number(userId),
          },
        },
        include: {
          transaction: true,
          profileUserSubscription: {
            include: {
              profileSubscriptionTier: {
                include: {
                  profile: {
                    include: {
                      avatar: { where: { deletedAt: null } },
                    },
                  },
                },
              },
            },
          },
        },
      });
      const results = charges.map((c) => {
        const remapped = serializeProfileUserSubscriptionCharge(c);
        const profile =
          c.profileUserSubscription?.profileSubscriptionTier?.profile;
        const sub = remapped.artistUserSubscription;
        const tier = sub?.artistSubscriptionTier;
        if (profile && sub && tier) {
          return {
            ...remapped,
            artistUserSubscription: {
              ...sub,
              artistSubscriptionTier: {
                ...tier,
                artist: processSingleArtist(profile),
              },
            },
          };
        }
        return remapped;
      });
      res.json({
        results,
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
