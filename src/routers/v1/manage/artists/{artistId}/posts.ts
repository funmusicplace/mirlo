import prisma from "@mirlo/prisma";
import { NextFunction, Request, Response } from "express";

import { assertLoggedIn } from "../../../../../auth/getLoggedInUser";
import {
  artistBelongsToLoggedInUser,
  userAuthenticated,
} from "../../../../../auth/passport";
import { AppError } from "../../../../../utils/error";
import { serializePost } from "../../../../../utils/serialize/post";

export default function () {
  const operations = {
    GET: [userAuthenticated, artistBelongsToLoggedInUser, GET],
    POST: [userAuthenticated, artistBelongsToLoggedInUser, POST],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { artistId } = req.params;
    const {
      skip = 0,
      take = 10,
      isDraft,
      isScheduled,
    } = req.query as {
      skip?: string;
      take?: string;
      isDraft?: string;
      isScheduled?: string;
    };

    try {
      const where = {
        artistId: Number(artistId),
        ...(isDraft !== undefined ? { isDraft: isDraft === "true" } : {}),
        ...(isScheduled === "true"
          ? { publishedAt: { gt: new Date() } }
          : isScheduled === "false"
            ? { publishedAt: { lte: new Date() } }
            : {}),
      };

      const [posts, total] = await Promise.all([
        prisma.post.findMany({
          where,
          orderBy: { publishedAt: "desc" },
          include: { featuredImage: true },
          skip: Number(skip),
          take: Number(take),
        }),
        prisma.post.count({ where }),
      ]);

      res.json({
        results: posts.map((post) =>
          serializePost(post, undefined, undefined, true)
        ),
        total,
      });
    } catch (e) {
      next(e);
    }
  }

  async function POST(req: Request, res: Response, next: NextFunction) {
    const { artistId } = req.params;
    const {
      title,
      content,
      isPublic,
      publishedAt,
      minimumSubscriptionTierId,
      shouldSendEmail,
    } = req.body as unknown as {
      title: string;
      content: string;
      isPublic: boolean;
      minimumSubscriptionTierId: number;
      publishedAt: string;
      shouldSendEmail: boolean;
    };

    assertLoggedIn(req);

    try {
      const artist = await prisma.artist.findFirst({
        where: { id: Number(artistId) },
        select: { id: true },
      });

      if (!artist) {
        throw new AppError({ description: "Artist not found", httpCode: 404 });
      }

      const mostRecentPost = await prisma.post.findFirst({
        where: { artistId: Number(artistId), deletedAt: null },
        orderBy: { createdAt: "desc" },
        select: { minimumSubscriptionTierId: true, shouldSendEmail: true },
      });

      const resolvedTierId =
        minimumSubscriptionTierId ?? mostRecentPost?.minimumSubscriptionTierId;
      const resolvedShouldSendEmail =
        shouldSendEmail ?? mostRecentPost?.shouldSendEmail ?? true;

      let validTier;
      if (resolvedTierId) {
        validTier = await prisma.artistSubscriptionTier.findFirst({
          where: { artistId: Number(artistId), id: resolvedTierId },
        });
      } else {
        validTier = await prisma.artistSubscriptionTier.findFirst({
          where: { artistId: Number(artistId), isDefaultTier: true },
        });
        if (!validTier) {
          await prisma.artistSubscriptionTier.create({
            data: {
              name: "follow",
              description: "follow an artist",
              minAmount: 0,
              isDefaultTier: true,
              artistId: artist.id,
            },
          });
          validTier = await prisma.artistSubscriptionTier.findFirst({
            where: { artistId: Number(artistId), isDefaultTier: true },
          });
        }
      }

      if (validTier) {
        const result = await prisma.post.create({
          data: {
            title,
            content,
            isPublic,
            publishedAt,
            shouldSendEmail: resolvedShouldSendEmail,
            artist: { connect: { id: Number(artistId) } },
            minimumSubscriptionTier: { connect: { id: validTier.id } },
          },
        });
        res.json({ result });
      } else {
        throw new AppError({
          description: "That tier doesn't belong to the current artist",
          httpCode: 400,
        });
      }
    } catch (e) {
      next(e);
    }
  }

  return operations;
}
