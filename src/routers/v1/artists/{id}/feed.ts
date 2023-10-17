import { Request, Response } from "express";
import { User, Prisma } from "@prisma/client";

import prisma from "../../../../../prisma/prisma";
import { userLoggedInWithoutRedirect } from "../../../../auth/passport";

export default function () {
  const operations = {
    GET: [userLoggedInWithoutRedirect, GET],
  };

  async function GET(req: Request, res: Response) {
    const { id } = req.params;
    const user = req.user as User;

    try {
      const artist = await prisma.artist.findFirst({
        where: {
          id: Number(id),
        },
        include: {
          subscriptionTiers: true,
        },
      });

      if (!artist) {
        return res.status(404).json({
          error: "Artist not found",
        });
      }
      let where: Prisma.PostWhereInput = {
        publishedAt: { lte: new Date() },
        artistId: Number(id),
        isPublic: true,
      };

      if (user) {
        delete where.isPublic;
        // FIXME: is there a way to craft the where statement so that
        // we don't have to post process this?
      }

      let posts = await prisma.post.findMany({
        where,
        include: {
          artist: true,
          minimumSubscriptionTier: true,
          postSubscriptionTiers: true,
        },
        orderBy: {
          publishedAt: "desc",
        },
        take: 20,
      });

      if (user) {
        const userSubscription = await prisma.artistUserSubscription.findFirst({
          where: {
            userId: user.id,
            artistSubscriptionTierId: {
              in: artist.subscriptionTiers.map((s) => s.id),
            },
          },
          orderBy: {
            amount: "asc",
          },
        });
        if (userSubscription) {
          // Filter posts
          // If the post minimum tier matches the user's subscription :ok:
          // If any of the post's tiers match the user's subscription :ok:
          posts = posts.filter(
            (p) =>
              (p.minimumSubscriptionTier?.minAmount ?? 0) <=
                userSubscription.amount ||
              p.postSubscriptionTiers.find(
                (t) =>
                  userSubscription.artistSubscriptionTierId ===
                  t.artistSubscriptionTierId
              )
          );
        } else {
          posts.filter((p) => p.isPublic);
        }
      }

      res.json({
        results: posts,
      });
    } catch (e) {
      console.error(`/v1/artists/{id}/feed ${e}`);
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
