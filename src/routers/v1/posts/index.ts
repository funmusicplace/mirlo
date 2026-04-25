import prisma from "@mirlo/prisma";
import { Prisma } from "@mirlo/prisma/client";
import { NextFunction, Request, Response } from "express";

import { userLoggedInWithoutRedirect } from "../../../auth/passport";
import { checkIsUserSubscriber } from "../../../utils/artist";
import postProcessor from "../../../utils/post";

export default function () {
  const operations = {
    GET: [userLoggedInWithoutRedirect, GET],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const user = req.user;
    const { take, skip } = req.query;
    try {
      const artistVisibility: Prisma.PostWhereInput = {
        OR: [
          { artistId: null },
          { artist: { enabled: true, deletedAt: null } },
        ],
      };

      let where: Prisma.PostWhereInput = {
        publishedAt: { lte: new Date() },
        isPublic: true,
        isDraft: false,
        ...artistVisibility,
      };
      if (user) {
        where = {
          publishedAt: { lte: new Date() },
          isDraft: false,
          AND: [
            artistVisibility,
            {
              OR: [
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
              ],
            },
          ],
        };
      }

      const posts = await prisma.post.findMany({
        where,
        include: {
          artist: true,
          featuredImage: true,
          tracks: {
            orderBy: {
              order: "asc",
            },
          },
        },
        orderBy: {
          publishedAt: "desc",
        },
        take: take ? Number(take) : undefined,
        skip: skip ? Number(skip) : undefined,
      });

      const processedPosts = await Promise.all(
        posts.map(async (p) =>
          postProcessor.single(
            p,
            (p.artistId
              ? await checkIsUserSubscriber(user, p.artistId)
              : false) || p.artist?.userId === user?.id
          )
        )
      );

      return res.json({
        results: processedPosts,
      });
    } catch (e) {
      next(e);
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
