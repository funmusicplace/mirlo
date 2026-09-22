import prisma from "@mirlo/prisma";
import { Request, Response } from "express";

import { assertLoggedIn } from "../../../../../../auth/getLoggedInUser";
import { userAuthenticated } from "../../../../../../auth/passport";
import { AppError } from "../../../../../../utils/error";

type Params = {
  userId: string;
  notificationId: string;
};

export default function () {
  const operations = {
    PUT: [userAuthenticated, PUT],
  };

  async function PUT(req: Request, res: Response) {
    const { userId, notificationId } = req.params as unknown as Params;

    assertLoggedIn(req);
    const loggedInUser = req.user;

    if (Number(userId) !== Number(loggedInUser.id)) {
      throw new AppError({
        httpCode: 401,
        description: "Invalid access",
      });
    }

    const notification = await prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId: Number(userId),
      },
    });

    if (!notification) {
      throw new AppError({
        httpCode: 404,
        description: "Notification not found",
      });
    }

    const updated = await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });

    return res.status(200).json({
      result: updated,
    });
  }

  PUT.apiDoc = {
    summary: "Update notification",
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
        description: "Notification succesfully updated",
        schema: {
          type: "object",
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
