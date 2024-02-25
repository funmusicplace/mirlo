import { User } from "@prisma/client";
import { Request, Response } from "express";
import { userAuthenticated } from "../../../../auth/passport";
import prisma from "../../../../../prisma/prisma";
import { AppError } from "../../../../utils/error";
import artists from "./artists";

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
        },
        orderBy: {
          createdAt: "desc",
        },
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
