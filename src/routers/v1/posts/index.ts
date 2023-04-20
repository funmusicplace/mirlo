import { Request, Response } from "express";
import { User } from "@prisma/client";

import postProcessor from "./processor";

import prisma from "../../../../prisma/prisma";
import { userLoggedInWithoutRedirect } from "../../../auth/passport";
import { checkIsUserSubscriber } from "../../../utils/artist";

export default function () {
  const operations = {
    GET: [userLoggedInWithoutRedirect, GET],
  };

  async function GET(req: Request, res: Response) {
    const user = req.user as User;

    const posts = await prisma.post.findMany({
      where: {
        publishedAt: { lte: new Date() },
      },
      include: {
        artist: true,
      },
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
    res.json({
      results: processedPosts,
    });
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
