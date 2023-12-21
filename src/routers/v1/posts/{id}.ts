import { NextFunction, Request, Response } from "express";
import prisma from "../../../../prisma/prisma";
import { userLoggedInWithoutRedirect } from "../../../auth/passport";
import { User } from "@prisma/client";
import postProcessor from "../../../utils/post";
import { checkIsUserSubscriber } from "../../../utils/artist";

export default function () {
  const operations = {
    GET: [userLoggedInWithoutRedirect, GET],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { id }: { id?: string } = req.params;
    const user = req.user as User | undefined;

    try {
      const post = await prisma.post.findFirst({
        where: {
          id: Number(id),
          publishedAt: {
            lte: new Date(),
          },
        },
        include: {
          artist: true,
        },
      });

      if (!post) {
        return res.status(404).json({ error: "Post not found" });
      }
      const isUserSubscriber = await checkIsUserSubscriber(user, post.artistId);
      console.log("isUserSubscriber", isUserSubscriber, !post.isPublic);
      res.json({
        result: postProcessor.single(
          post,
          isUserSubscriber || post.artist?.userId === user?.id
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
