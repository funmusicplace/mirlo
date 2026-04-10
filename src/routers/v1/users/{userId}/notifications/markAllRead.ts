import { Request, Response } from "express";
import {
  userAuthenticated,
  userHasPermission,
} from "../../../../../auth/passport";
import prisma from "@mirlo/prisma";

type Params = {
  userId: string;
};

export default function () {
  const operations = {
    PUT: [userAuthenticated, userHasPermission("owner"), PUT],
  };

  async function PUT(req: Request, res: Response) {
    const { userId } = req.params as unknown as Params;

    await prisma.notification.updateMany({
      where: { userId: Number(userId), isRead: false },
      data: { isRead: true },
    });

    return res.json({ result: "ok" }).status(200);
  }

  PUT.apiDoc = {
    summary: "Mark all notifications as read",
    parameters: [
      { in: "path", name: "userId", required: true, type: "string" },
    ],
    responses: {
      200: {
        description: "All notifications marked as read",
        schema: { type: "object" },
      },
      default: {
        description: "An error occurred",
        schema: { additionalProperties: true },
      },
    },
  };

  return operations;
}
