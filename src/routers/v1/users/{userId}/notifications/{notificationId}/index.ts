import prisma from "@mirlo/prisma";
import { NotificationType } from "@mirlo/prisma/client";
import { Request, Response } from "express";

import { assertLoggedIn } from "../../../../../../auth/getLoggedInUser";
import { userOrAppAuthenticated } from "../../../../../../auth/passport";
import { AppError } from "../../../../../../utils/error";

type Params = {
  userId: string;
  notificationId: string;
};

const REMOVABLE_NOTIFICATION_TYPES: NotificationType[] = ["AP_MENTION"];

export default function () {
  const operations = {
    PUT: [userOrAppAuthenticated, PUT],
    DELETE: [userOrAppAuthenticated, DELETE],
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

  async function DELETE(req: Request, res: Response) {
    const { userId, notificationId } = req.params as unknown as Params;

    assertLoggedIn(req);
    const loggedInUser = req.user;

    if (Number(userId) !== Number(loggedInUser.id)) {
      throw new AppError({
        httpCode: 401,
        description: "Invalid access",
      });
    }

    const { count } = await prisma.notification.deleteMany({
      where: {
        id: notificationId,
        userId: Number(userId),
        notificationType: { in: REMOVABLE_NOTIFICATION_TYPES },
      },
    });

    if (count > 0) {
      return res.status(200).json({ result: "ok" });
    }

    const notification = await prisma.notification.findFirst({
      where: { id: notificationId, userId: Number(userId) },
      select: { id: true },
    });

    if (notification) {
      throw new AppError({
        httpCode: 400,
        description: "This notification can't be removed",
      });
    }

    throw new AppError({
      httpCode: 404,
      description: "Notification not found",
    });
  }

  DELETE.apiDoc = {
    summary: "Remove a notification from the user's feed",
    parameters: [
      {
        in: "path",
        name: "userId",
        required: true,
        type: "string",
      },
      {
        in: "path",
        name: "notificationId",
        required: true,
        type: "string",
      },
    ],
    responses: {
      200: {
        description: "Notification removed",
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
