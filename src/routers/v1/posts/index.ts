import { Request, Response } from "express";
import { User, Prisma } from "@prisma/client";

import postProcessor from "../../../utils/post";

import prisma from "../../../../prisma/prisma";
import { userLoggedInWithoutRedirect } from "../../../auth/passport";
import { checkIsUserSubscriber } from "../../../utils/artist";

export default function () {
  const operations = {
    GET: [userLoggedInWithoutRedirect, GET],
  };

  async function GET(req: Request, res: Response) {
    const user = req.user as User;
    try {
      let where: Prisma.PostWhereInput = {
        publishedAt: { lte: new Date() },
        isPublic: true,
      };

      if (user) {
        delete where.isPublic;
        where.OR = [
          {
            isPublic: true,
          },
          {
            minimumSubscriptionTier: {
              userSubscriptions: {
                some: {
                  userId: user.id,
                },
              },
            },
          },
          {
            postSubscriptionTiers: {
              some: {
                artistSubscriptionTier: {
                  userSubscriptions: {
                    some: {
                      userId: user.id,
                    },
                  },
                },
              },
            },
          },
        ];
      }
      const posts = await prisma.post.findMany({
        where,
        include: {
          artist: true,
        },
        orderBy: {
          publishedAt: "desc",
        },
        take: 20,
      });
      const processedPosts = await Promise.all(
        posts.map(async (p) =>
          postProcessor.single(
            p,
            (p.artistId
              ? await checkIsUserSubscriber(user, p.artistId)
              : false) || p.artist?.userId === user?.id,
          ),
        ),
      );
      res.json({
        results: processedPosts,
      });
    } catch (e) {
      console.error(`/v1/posts ${e}`);
      res.status(400);
    }
  }

  GET.apiDoc = {
    summary: "Returns all published posts",
    responses: {
      200: {
        description: "A list of published posts",
        schema: {
          type: "array",
          items: {
            $ref: "#/definitions/Post",
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
