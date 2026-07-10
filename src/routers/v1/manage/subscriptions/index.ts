import { Prisma } from "@mirlo/prisma/client";
import { NextFunction, Request, Response } from "express";
import { userAuthenticated } from "../../../../auth/passport";
import { assertLoggedIn } from "../../../../auth/getLoggedInUser";
import prisma from "@mirlo/prisma";
import {
  toApiSubscriptionTier,
  toApiUserSubscription,
} from "../../../../utils/serialize/apiNaming";

type Params = {
  userId: string;
};

export default function () {
  const operations = {
    GET: [userAuthenticated, GET],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { userId } = req.params as unknown as Params;
    const { artistId } = req.query as unknown as { artistId?: string };
    assertLoggedIn(req);
    const loggedInUser = req.user;
    try {
      if (Number(userId) === Number(loggedInUser.id)) {
        const where: Prisma.ProfileUserSubscriptionWhereInput = {
          userId: Number(userId),
          profileSubscriptionTier: { isDefaultTier: false },
        };
        if (artistId) {
          where.profileSubscriptionTier = {
            profileId: Number(artistId),
            isDefaultTier: false,
            deletedAt: null,
          };
        }
        const subsciptions = await prisma.profileUserSubscription.findMany({
          where,
          include: {
            profileSubscriptionTier: true,
          },
        });
        res.json({
          results: subsciptions.map((sub) =>
            toApiUserSubscription({
              ...sub,
              profileSubscriptionTierId: sub.profileSubscriptionTier.id,
              profileSubscriptionTier: toApiSubscriptionTier(
                sub.profileSubscriptionTier
              ),
            })
          ),
        });
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
    summary: "Returns user artists",
    responses: {
      200: {
        description: "Subscriptions that belong to the user",
        schema: {
          type: "array",
          items: {
            $ref: "#/definitions/Profile",
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
