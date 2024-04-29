import { User } from "@mirlo/prisma/client";
import { Request, Response } from "express";
import { userAuthenticated } from "../../../../../auth/passport";
import prisma from "@mirlo/prisma";
import { AppError } from "../../../../../utils/error";

type Params = {
  userId: string;
};

export default function () {
  const operations = {
    GET: [userAuthenticated, GET],
  };

  async function GET(req: Request, res: Response) {
    const { userId } = req.params as unknown as Params;
    const { skip: skipQuery, take, unreadCount } = req.query;

    const loggedInUser = req.user as User;

    if (Number(userId) === Number(loggedInUser.id)) {
      const notifications = await prisma.notification.findMany({
        where: {
          userId: Number(userId),
        },
        include: {
          post: {
            include: {
              artist: true,
            },
          },
          trackGroup: {
            include: {
              artist: true,
            },
          },
          subscription: {
            include: { artistSubscriptionTier: { include: { artist: true } } },
          },
          relatedUser: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        skip: skipQuery ? Number(skipQuery) : undefined,
        take: take ? Number(take) : 10,
      });

      res.json({
        results: notifications,
      });
    } else {
      throw new AppError({
        httpCode: 401,
        description: "Invalid access",
      });
    }
  }

  GET.apiDoc = {
    summary: "Returns user notifications",
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
