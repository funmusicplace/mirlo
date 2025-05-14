import { Prisma, User } from "@mirlo/prisma/client";
import { NextFunction, Request, Response } from "express";
import { userAuthenticated } from "../../../../auth/passport";

import prisma from "@mirlo/prisma";
import { AppError } from "../../../../utils/error";

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

    const user = req.user as User;
    try {
      const artist = await prisma.artist.findFirst({
        where: {
          id: artistId,
          userId: user.id,
        },
      });
      if (!artist) {
        throw new AppError({
          description: "Artist must belong to logged in user",
          httpCode: 400,
        });
      }
      let validTier;
      if (!minimumSubscriptionTierId) {
        validTier = await prisma.artistSubscriptionTier.findFirst({
          where: {
            artistId,
            id: minimumSubscriptionTierId,
          },
        });
      } else {
        validTier = await prisma.artistSubscriptionTier.findFirst({
          where: { artistId, isDefaultTier: true },
        });
      }

      if (validTier) {
        const result = await prisma.post.create({
          data: {
            title,
            content,
            isPublic,
            publishedAt,
            shouldSendEmail,
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
  // FIXME: document POST

  async function GET(req: Request, res: Response) {
    const { artistId } = req.query;

    let where: Prisma.PostWhereInput = {};
    if (artistId) {
      where.artistId = Number(artistId);
    }

    const posts = await prisma.post.findMany({
      where,
      orderBy: {
        publishedAt: "desc",
      },
    });

    res.json({
      results: posts,
    });
  }

  return operations;
}
