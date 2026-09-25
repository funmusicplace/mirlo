import prisma from "@mirlo/prisma";
import { Request, Response } from "express";

import { assertLoggedIn } from "../../../../../../auth/getLoggedInUser";
import { userAuthenticated } from "../../../../../../auth/passport";
import { AppError } from "../../../../../../utils/error";
import {
  applySpamStrike,
  SPAM_CONTACT_MESSAGE_REASON,
} from "../../../../../../utils/spamStrikes";

type Params = {
  userId: string;
  notificationId: string;
};

export default function () {
  const operations = {
    POST: [userAuthenticated, POST],
  };

  async function POST(req: Request, res: Response) {
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

    if (
      notification.notificationType !== "ARTIST_CONTACT_MESSAGE" ||
      !notification.relatedUserId
    ) {
      throw new AppError({
        httpCode: 400,
        description: "This notification can't be reported as spam",
      });
    }

    if (!notification.spamReportedAt) {
      const senderId = notification.relatedUserId;
      await prisma.$transaction(async (tx) => {
        await tx.notification.update({
          where: { id: notificationId },
          data: { spamReportedAt: new Date(), isRead: true },
        });
        const flag = await tx.contentFlag.create({
          data: {
            source: "USER_REPORT",
            reason: SPAM_CONTACT_MESSAGE_REASON,
            description: notification.content,
            reporterEmail: loggedInUser.email,
            reportedUserId: senderId,
          },
        });
        await applySpamStrike(senderId, flag.id, tx);
      });
    }

    const updated = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    return res.status(200).json({
      result: updated,
    });
  }

  POST.apiDoc = {
    summary:
      "Report the sender of an ARTIST_CONTACT_MESSAGE notification as spam, lowering their trust level",
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
        description: "Notification reported as spam",
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
