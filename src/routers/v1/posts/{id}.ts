import { NextFunction, Request, Response } from "express";
import prisma from "../../../../prisma/prisma";
import { userLoggedInWithoutRedirect } from "../../../auth/passport";
import { User } from "@prisma/client";
import postProcessor, { processSinglePost } from "../../../utils/post";
import { checkIsUserSubscriber } from "../../../utils/artist";
import { AppError } from "../../../utils/error";

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
          artist: {
            include: {
              avatar: {
                where: {
                  deletedAt: null,
                },
              },
            },
          },
        },
      });

      if (!post) {
        throw new AppError({
          httpCode: 404,
          description: "Post not found",
        });
      }

      const isUserSubscriber = await checkIsUserSubscriber(user, post.artistId);
      res.json({
        result: processSinglePost(
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
