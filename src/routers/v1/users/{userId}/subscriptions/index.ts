import { Prisma, User } from "@prisma/client";
import { Request, Response } from "express";
import { userAuthenticated } from "../../../../../auth/passport";
import prisma from "../../../../../../prisma/prisma";

type Params = {
  userId: string;
};

export default function () {
  const operations = {
    GET: [userAuthenticated, GET],
  };

  async function GET(req: Request, res: Response) {
    const { userId } = req.params as unknown as Params;
    const { artistId } = req.query as unknown as { artistId: string };
    const loggedInUser = req.user as User;
    try {
      if (Number(userId) === Number(loggedInUser.id)) {
        const where: Prisma.ArtistUserSubscriptionWhereInput = {
          userId: Number(userId),
          artistSubscriptionTier: { isDefaultTier: false },
        };
        if (artistId) {
          where.artistSubscriptionTier = {
            artistId: Number(artistId),
            isDefaultTier: false,
            deletedAt: null,
          };
        }
        const subsciptions = await prisma.artistUserSubscription.findMany({
          where,
          include: {
            artistSubscriptionTier: true,
          },
        });
        res.json({ results: subsciptions });
      } else {
        res.status(401);
        res.json({
          error: "Invalid route",
        });
      }
    } catch (e) {
      console.error("users/{userId}/subscriptions GET", e);
      res.status(500);
    }
  }

  GET.apiDoc = {
    summary: "Returns user artists",
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
        description: "Subscriptions that belong to the user",
        schema: {
          type: "array",
          items: {
            $ref: "#/definitions/Artist",
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
