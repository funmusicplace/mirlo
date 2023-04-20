import { Request, Response } from "express";
import prisma from "../../../../prisma/prisma";
import { userLoggedInWithoutRedirect } from "../../../auth/passport";
import { User } from "@prisma/client";

export default function () {
  const operations = {
    GET: [userLoggedInWithoutRedirect, GET],
  };

  async function GET(req: Request, res: Response) {
    const { id }: { id?: string } = req.params;
    const user = req.user as User;

    const post = await prisma.post.findUnique({
      where: { id: Number(id) },
    });
    res.json({ result: post });
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
