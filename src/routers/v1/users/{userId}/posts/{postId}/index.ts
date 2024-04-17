import { NextFunction, Request, Response } from "express";
import { userAuthenticated } from "../../../../../../auth/passport";
import prisma from "../../../../../../../prisma/prisma";
import { doesPostBelongToUser } from "../../../../../../utils/post";

export default function () {
  const operations = {
    PUT: [userAuthenticated, doesPostBelongToUser, PUT],
    DELETE: [userAuthenticated, doesPostBelongToUser, DELETE],
    GET: [userAuthenticated, doesPostBelongToUser, GET],
  };

  async function PUT(req: Request, res: Response, next: NextFunction) {
    const { postId } = req.params;
    try {
      const {
        title,
        artistId,
        content,
        isPublic,
        publishedAt,
        minimumSubscriptionTierId,
        shouldSendEmail,
      } = req.body;

      if (minimumSubscriptionTierId !== undefined) {
        const validTier = await prisma.artistSubscriptionTier.findFirst({
          where: {
            artistId,
            id: minimumSubscriptionTierId,
          },
        });

        if (!validTier) {
          return res.status(400).json({
            error: "That subscription tier isn't associated with the artist",
          });
        }
      }

      const post = await prisma.post.update({
        data: {
          title,
          artistId,
          content,
          isPublic,
          publishedAt,
          minimumSubscriptionTierId,
          shouldSendEmail,
        },
        where: {
          id: Number(postId),
        },
      });
      res.json({ result: post });
    } catch (e) {
      next(e);
    }
  }

  async function DELETE(req: Request, res: Response, next: NextFunction) {
    const { userId, postId } = req.params;
    try {
      await prisma.post.delete({
        where: {
          id: Number(postId),
        },
      });
      res.json({ message: "Success" });
    } catch (e) {
      next(e);
    }
  }

  DELETE.apiDoc = {
    summary: "Deletes a Post",
    parameters: [
      {
        in: "path",
        name: "postId",
        required: true,
        type: "string",
      },
    ],
    responses: {
      200: {
        description: "Delete success",
      },
      default: {
        description: "An error occurred",
        schema: {
          additionalProperties: true,
        },
      },
    },
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { postId }: { postId?: string } = req.params;

    try {
      const post = await prisma.post.findUnique({
        where: { id: Number(postId) },
      });
      res.json({ result: post });
    } catch (e) {
      next(e);
    }
  }

  GET.apiDoc = {
    summary: "Returns Post information",
    parameters: [
      {
        in: "path",
        name: "userId",
        required: true,
        type: "string",
      },
      {
        in: "path",
        name: "postId",
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
