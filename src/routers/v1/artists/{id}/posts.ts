import { NextFunction, Request, Response } from "express";
import { User } from "@mirlo/prisma/client";

import prisma from "@mirlo/prisma";
import { userLoggedInWithoutRedirect } from "../../../../auth/passport";
import { findArtistIdForURLSlug } from "../../../../utils/artist";

import { AppError } from "../../../../utils/error";
import { getPostsVisibleToUser } from "./feed";

export default function () {
  const operations = {
    GET: [userLoggedInWithoutRedirect, GET],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    let { id }: { id?: string } = req.params;
    const { skip, take = 10 } = req.query as unknown as {
      skip: string;
      take: string;
    };
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

      const posts = await getPostsVisibleToUser(
        user,
        artist,
        take ? Number(take) : undefined,
        skip ? Number(skip) : undefined
      );

      res.json({
        results: posts.posts,
        total: posts.total,
      });
    } catch (e) {
      console.error(e);
      next(
        new AppError({
          httpCode: 400,
          description: "Error finding posts for artist",
        })
      );
    }
  }

  GET.apiDoc = {
    summary: "Returns all published posts for an artist",
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
