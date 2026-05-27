import prisma from "@mirlo/prisma";
import { NextFunction, Request, Response } from "express";

import { userLoggedInWithoutRedirect } from "../../../auth/passport";
import { AppError } from "../../../utils/error";
import {
  canUserSeePostContent,
  getUserSubscriptionForArtist,
} from "../../../utils/postAccess";
import { serializePost } from "../../../utils/serialize/post";

export default function () {
  const operations = {
    GET: [userLoggedInWithoutRedirect, GET],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { id }: { id?: string } = req.params;
    const { artistId }: { artistId?: string } = req.query;
    const user = req.user;

    try {
      let postForURLSlug;
      if (artistId) {
        postForURLSlug = await prisma.post.findFirst({
          where: {
            AND: [
              { urlSlug: { equals: id, mode: "insensitive" } },
              {
                artist: {
                  urlSlug: artistId,
                },
              },
            ],
          },
        });
      } else {
        // If there's just one post with this slug we don't need an artistId
        const possiblePosts = await prisma.post.findMany({
          where: {
            urlSlug: { equals: id, mode: "insensitive" },
          },
        });
        if (possiblePosts.length === 1) {
          postForURLSlug = possiblePosts[0];
        }
      }
      const resolvedId = postForURLSlug?.id ?? Number(id);
      if (isNaN(resolvedId)) {
        throw new AppError({ httpCode: 404, description: "Post not found" });
      }

      const post = await prisma.post.findFirst({
        where: {
          id: resolvedId,
          publishedAt: {
            lte: new Date(),
          },
          isDraft: false,
        },
        include: {
          tracks: {
            include: {
              track: {
                select: {
                  title: true,
                  isPreview: true,
                  trackGroupId: true,
                  audio: { select: { duration: true } },
                  trackGroup: {
                    select: {
                      userTrackGroupPurchases: {
                        where: {
                          userId: user?.id,
                        },
                        select: {
                          userId: true,
                        },
                      },
                    },
                  },
                  userTrackPurchases: {
                    where: {
                      userId: user?.id,
                    },
                    select: {
                      userId: true,
                    },
                  },
                },
              },
            },
            orderBy: {
              order: "asc",
            },
          },
          featuredImage: true,
          minimumSubscriptionTier: true,
          postSubscriptionTiers: true,
          artist: {
            include: {
              avatar: {
                where: {
                  deletedAt: null,
                },
              },
            },
          },
        },
      });

      if (!post) {
        throw new AppError({
          httpCode: 404,
          description: "Post not found",
        });
      }
      const isArtistOwner = !!(user && post.artist?.userId === user.id);
      const subscription = post.artistId
        ? await getUserSubscriptionForArtist(user, post.artistId)
        : null;
      const canSeeContent = canUserSeePostContent(post, {
        isArtistOwner,
        subscription,
      });

      const userTrackGroupPurchases = user
        ? await prisma.userTrackGroupPurchase.findMany({
            where: {
              userId: user.id,
              trackGroupId: {
                in: post.tracks
                  ?.filter((t) => t.track?.trackGroupId)
                  .map((t) => t.track?.trackGroupId) as number[],
              },
            },
          })
        : undefined;
      const userTrackPurchases = user
        ? await prisma.userTrackPurchase.findMany({
            where: {
              userId: user.id,
              trackId: { in: post.tracks?.map((t) => t.trackId) as number[] },
            },
          })
        : undefined;
      res.json({
        result: serializePost(
          post,
          userTrackGroupPurchases,
          userTrackPurchases,
          canSeeContent
        ),
      });
    } catch (e) {
      next(e);
    }
  }

  GET.apiDoc = {
    summary: "Returns Post information",
    parameters: [
      {
        in: "path",
        name: "id",
        required: true,
        type: "string",
      },
    ],
    responses: {
      200: {
        description: "A post that matches the id",
        schema: {
          $ref: "#/definitions/Post",
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
