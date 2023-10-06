import { User } from "@prisma/client";
import { Request, Response } from "express";
import { userAuthenticated } from "../../../../auth/passport";
import prisma from "../../../../../prisma/prisma";
import postProcessor from "../../../../utils/post";

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
      const posts = await prisma.post.findMany({
        where: {
          publishedAt: {
            lte: new Date(),
          },
          artist: {
            subscriptionTiers: {
              some: {
                userSubscriptions: {
                  some: {
                    userId: loggedInUser.id,
                  },
                },
              },
            },
          },
        },
        include: {
          artist: true,
        },
      });

      res.json({
        results: await Promise.all(
          posts.map(async (p) => postProcessor.single(p, true))
        ),
      });
    } else {
      res.status(401).json({
        error: "Invalid route",
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
