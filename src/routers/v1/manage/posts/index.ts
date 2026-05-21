import prisma from "@mirlo/prisma";
import { Prisma } from "@mirlo/prisma/client";
import { NextFunction, Request, Response } from "express";

import { assertLoggedIn } from "../../../../auth/getLoggedInUser";
import {
  artistEditableByUser,
  userAuthenticated,
} from "../../../../auth/passport";
import { AppError } from "../../../../utils/error";
import { serializePost } from "../../../../utils/serialize/post";

export default function () {
  const operations = {
    POST: [userAuthenticated, POST],
    GET: [userAuthenticated, GET],
  };

  async function POST(req: Request, res: Response, next: NextFunction) {
    const {
      title,
      content,
      artistId,
      isPublic,
      publishedAt,
      minimumSubscriptionTierId,
      shouldSendEmail,
    } = req.body as unknown as {
      title: string;
      content: string;
      artistId: number;
      isPublic: boolean;
      minimumSubscriptionTierId: number;
      publishedAt: string;
      shouldSendEmail: boolean;
    };

    assertLoggedIn(req);
    const user = req.user;
    try {
      const artist = await prisma.artist.findFirst({
        where: { id: artistId, userId: user.id },
        select: { id: true, user: { select: { currency: true } } },
      });
      if (!artist) {
        throw new AppError({
          description: "Artist must belong to logged in user",
          httpCode: 400,
        });
      }

      const mostRecentPost = await prisma.post.findFirst({
        where: { artistId, deletedAt: null },
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
          where: {
            artistId,
            id: resolvedTierId,
          },
        });
      } else {
        validTier = await prisma.artistSubscriptionTier.findFirst({
          where: { artistId, isDefaultTier: true },
        });
        if (!validTier) {
          await prisma.artistSubscriptionTier.create({
            data: {
              name: "follow",
              description: "follow an artist",
              minAmount: 0,
              currency: artist.user.currency ?? "usd",
              isDefaultTier: true,
              artistId: artist.id,
            },
          });
          validTier = await prisma.artistSubscriptionTier.findFirst({
            where: { artistId, isDefaultTier: true },
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
            artist: { connect: { id: artistId } },
            minimumSubscriptionTier: {
              connect: { id: validTier?.id },
            },
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

  /** FIXME this should not be nested here, it should really live under /manage/artists/{id}/posts */
  async function GET(req: Request, res: Response) {
    const { artistId } = req.query;
    assertLoggedIn(req);
    if (!(await artistEditableByUser(artistId as string, req.user))) {
      throw new AppError({
        description:
          "Artist not found or user does not have permission to edit",
        httpCode: 404,
      });
    }

    let where: Prisma.PostWhereInput = {};
    if (artistId) {
      where.artistId = Number(artistId);
    }

    const posts = await prisma.post.findMany({
      where,
      orderBy: {
        publishedAt: "desc",
      },
      include: {
        featuredImage: true,
      },
    });

    res.json({
      results: posts.map((post) =>
        serializePost(post, undefined, undefined, true)
      ),
    });
  }

  return operations;
}
