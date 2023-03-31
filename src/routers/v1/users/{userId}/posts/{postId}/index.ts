import { PrismaClient } from "@prisma/client";
import { NextFunction, Request, Response } from "express";
import { userAuthenticated } from "../../../../../../auth/passport";
const prisma = new PrismaClient();

const doesPostBelongToUser = () => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const { userId, postId } = req.params;

    if (userId && postId) {
      const post = await prisma.post.findFirst({
        where: {
          artist: {
            userId: Number(userId),
          },
        },
      });
      if (post) {
        return next();
      } else {
        res.status(400).json({
          error: `Post must belong to user`,
        });
        return next(`Post must belong to user`);
      }
    } else {
      res.status(400).json({
        error: `Bad request`,
      });
      return next(`userId and postId are required`);
    }
  };
};

export default function () {
  const operations = {
    PUT: [userAuthenticated, doesPostBelongToUser(), PUT],
    DELETE: [userAuthenticated, doesPostBelongToUser(), DELETE],
    GET,
  };

  async function PUT(req: Request, res: Response) {
    const { postId } = req.params;

    const post = await prisma.post.update({
      data: req.body,
      where: {
        id: Number(postId),
      },
    });
    res.json({ result: post });
  }

  // FIXME: only allow delete of posts belonging to user
  async function DELETE(req: Request, res: Response) {
    const { userId, postId } = req.params;
    await prisma.post.delete({
      where: {
        id: Number(postId),
      },
    });
    res.json({ message: "Success" });
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

  async function GET(req: Request, res: Response) {
    const { id }: { id?: string } = req.params;

    const post = await prisma.post.findUnique({
      where: { id: Number(id) },
    });
    res.json(post);
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
