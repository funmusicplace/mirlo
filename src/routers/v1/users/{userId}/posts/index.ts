import { Prisma, User } from "@prisma/client";
import { NextFunction, Request, Response } from "express";
import {
  contentBelongsToLoggedInUserArtist,
  userAuthenticated,
} from "../../../../../auth/passport";

import prisma from "../../../../../../prisma/prisma";

export default function () {
  const operations = {
    POST: [userAuthenticated, contentBelongsToLoggedInUserArtist, POST],
    GET: [userAuthenticated, GET],
  };

  async function POST(req: Request, res: Response, next: NextFunction) {
    const { title, content, artistId, isPublic, minimumSubscriptionTierId } =
      req.body as unknown as {
        title: string;
        content: string;
        artistId: number;
        isPublic: boolean;
        minimumSubscriptionTierId: number;
      };
    const user = req.user as User;
    try {
      const validTier = await prisma.artistSubscriptionTier.findFirst({
        where: {
          artistId,
          id: minimumSubscriptionTierId,
        },
      });

      if (validTier) {
        const result = await prisma.post.create({
          data: {
            title,
            content,
            isPublic,
            artist: { connect: { id: artistId } },
            minimumSubscriptionTier: {
              connect: { id: validTier?.id },
            },
          },
        });
        res.json({ result });
      } else {
        res
          .status(404)
          .json({ error: "That tier doesn't belong to the current artist" });
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
    });

    res.json({
      results: posts,
    });
  }

  return operations;
}
