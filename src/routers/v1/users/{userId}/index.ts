import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";
import {
  userAuthenticated,
  userHasPermission,
} from "../../../../auth/passport";

const prisma = new PrismaClient();

export default function () {
  const operations = {
    GET,
    PUT: [userAuthenticated, userHasPermission("owner"), PUT],
  };

  async function GET(req: Request, res: Response) {
    const { userId }: { userId?: string } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: Number(userId) },
    });
    res.json({ result: user });
  }

  GET.apiDoc = {
    summary: "Returns User information",
    parameters: [
      {
        in: "path",
        name: "userId",
        required: true,
        type: "string",
      },
    ],
    responses: {
      200: {
        description: "A user that matches the userId",
        schema: {
          $ref: "#/definitions/User",
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

  async function PUT(req: Request, res: Response) {
    const { userId } = req.params as unknown as { userId: string };
    const { email, name } = req.body;

    const user = await prisma.user.update({
      select: {
        email: true,
        name: true,
      },
      where: {
        id: Number(userId),
      },
      data: {
        email,
        name,
      },
    });
    res.json(user);
  }

  return operations;
}
