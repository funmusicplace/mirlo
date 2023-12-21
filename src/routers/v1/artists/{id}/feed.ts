import { Request, Response } from "express";
import { User, Prisma } from "@prisma/client";

import RSS from "rss";

import prisma from "../../../../../prisma/prisma";
import { userLoggedInWithoutRedirect } from "../../../../auth/passport";
import { findArtistIdForURLSlug } from "../../../../utils/artist";
import { markdownAsHtml } from "../../../../utils/post";

export default function () {
  const operations = {
    GET: [userLoggedInWithoutRedirect, GET],
  };

  async function GET(req: Request, res: Response) {
    let { id }: { id?: string } = req.params;
    const { format } = req.query;
    const user = req.user as User;

    try {
      const parsedId = await findArtistIdForURLSlug(id);
      let artist;
      if (parsedId) {
        artist = await prisma.artist.findFirst({
          where: {
            id: Number(parsedId),
          },
          include: {
            subscriptionTiers: true,
          },
        });
      }

      if (!artist) {
        return res.status(404).json({
          error: "Artist not found",
        });
      }
      let where: Prisma.PostWhereInput = {
        publishedAt: { lte: new Date() },
        artistId: Number(parsedId),
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

      if (format === "rss") {
        // TODO: probably want to convert this to some sort of module
        const client = await prisma.client.findFirst({
          where: {
            applicationName: "frontend",
          },
        });

        const feed = new RSS({
          title: `${artist.name} Posts`,
          description: artist.bio ?? undefined,
          feed_url: `${process.env.API_DOMAIN}/v1/${artist.urlSlug}/feed?format=rss`,
          site_url: `${client?.applicationUrl}/${artist.urlSlug}`,
        });

        for (const p of posts) {
          feed.item({
            title: p.title,
            description: markdownAsHtml(p.content),
            url: `${client?.applicationUrl}/post/${p.id}`,
            date: p.publishedAt,
          });
        }

        res.set("Content-Type", "application/rss+xml");
        res.send(feed.xml());
      } else {
        res.json({
          results: posts,
        });
      }
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
