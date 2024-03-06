import { User } from "@prisma/client";
import { Request, Response } from "express";
import { userAuthenticated } from "../../../../../auth/passport";
import prisma from "../../../../../../prisma/prisma";
import { AppError } from "../../../../../utils/error";

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

    const loggedInUser = req.user as User;

    if (Number(userId) === Number(loggedInUser.id)) {
      const notification = await prisma.notification.update({
        where: {
          id: notificationId,
        },
        data: {
          isRead: true,
        },
      });
      return res
        .json({
          result: notification,
        })
        .status(200);
    } else {
      throw new AppError({
        httpCode: 401,
        description: "Invalid access",
      });
    }
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
