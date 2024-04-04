import { Prisma, User } from "@prisma/client";
import { NextFunction, Request, Response } from "express";
import {
  contentBelongsToLoggedInUserArtist,
  userAuthenticated,
} from "../../../../../auth/passport";

import prisma from "../../../../../../prisma/prisma";
import { AppError } from "../../../../../utils/error";

export default function () {
  const operations = {
    POST: [userAuthenticated, contentBelongsToLoggedInUserArtist, POST],
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
    try {
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
