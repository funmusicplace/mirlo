import { NextFunction, Request, Response } from "express";
import prisma from "@mirlo/prisma";
import { userLoggedInWithoutRedirect } from "../../../auth/passport";
import { User } from "@mirlo/prisma/client";
import { processSinglePost } from "../../../utils/post";
import { checkIsUserSubscriber } from "../../../utils/artist";
import { AppError } from "../../../utils/error";

export default function () {
  const operations = {
    GET: [userLoggedInWithoutRedirect, GET],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { id }: { id?: string } = req.params;
    const { artistId }: { artistId?: string } = req.query;
    const user = req.user as User | undefined;

    try {
      let postForURLSlug;
      if (artistId) {
        postForURLSlug = await prisma.post.findFirst({
          where: {
            AND: [
              { urlSlug: id },
              {
                artist: {
                  urlSlug: artistId,
                },
              },
            ],
          },
        });
      }
      const post = await prisma.post.findFirst({
        where: {
          id: postForURLSlug?.id || Number(id),
          publishedAt: {
            lte: new Date(),
          },
          isDraft: false,
        },
        include: {
          tracks: {
            orderBy: {
              order: "asc",
            },
          },
          featuredImage: true,
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
