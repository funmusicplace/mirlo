import prisma from "@mirlo/prisma";
import { NextFunction, Request, Response } from "express";

import { userLoggedInWithoutRedirect } from "../../../auth/passport";
import { AppError } from "../../../utils/error";
import {
  getCanUserSeePostContent,
  loadPurchasesForPostTracks,
} from "../../../utils/postAccess";
import { postIncludeForUser, serializePost } from "../../../serializers/post";

export default function () {
  const operations = {
    GET: [userLoggedInWithoutRedirect, GET],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { id }: { id?: string } = req.params;
    const { artistId }: { artistId?: string } = req.query;
    const user = req.user;

    try {
      let postForURLSlug;
      if (artistId) {
        postForURLSlug = await prisma.post.findFirst({
          where: {
            AND: [
              { urlSlug: { equals: id, mode: "insensitive" } },
              {
                profile: {
                  urlSlug: artistId,
                },
              },
            ],
          },
        });
      } else {
        // If there's just one post with this slug we don't need an artistId
        const possiblePosts = await prisma.post.findMany({
          where: {
            urlSlug: { equals: id, mode: "insensitive" },
          },
        });
        if (possiblePosts.length === 1) {
          postForURLSlug = possiblePosts[0];
        }
      }
      const resolvedId = postForURLSlug?.id ?? Number(id);
      if (isNaN(resolvedId)) {
        throw new AppError({ httpCode: 404, description: "Post not found" });
      }

      const post = await prisma.post.findFirst({
        where: {
          id: resolvedId,
          publishedAt: {
            lte: new Date(),
          },
          isDraft: false,
        },
        include: postIncludeForUser(user?.id),
      });

      if (!post) {
        throw new AppError({
          httpCode: 404,
          description: "Post not found",
        });
      }

      const canSeeContent = await getCanUserSeePostContent(user, post);
      const { userTrackGroupPurchases, userTrackPurchases } =
        await loadPurchasesForPostTracks(user, post);

      res.json({
        result: serializePost(
          post,
          userTrackGroupPurchases,
          userTrackPurchases,
          canSeeContent
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
