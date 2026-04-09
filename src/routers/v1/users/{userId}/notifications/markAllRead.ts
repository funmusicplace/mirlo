import { User } from "@mirlo/prisma/client";
import { Request, Response } from "express";
import { userAuthenticated } from "../../../../../auth/passport";
import prisma from "@mirlo/prisma";
import { AppError } from "../../../../../utils/error";

type Params = {
  userId: string;
};

export default function () {
  const operations = {
    PUT: [userAuthenticated, PUT],
  };

  async function PUT(req: Request, res: Response) {
    const { userId } = req.params as unknown as Params;
    const loggedInUser = req.user as User;

    if (Number(userId) !== Number(loggedInUser.id)) {
      throw new AppError({ httpCode: 401, description: "Invalid access" });
    }

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
