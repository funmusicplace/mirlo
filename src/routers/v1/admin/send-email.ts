import prisma from "@mirlo/prisma";
import { NextFunction, Request, Response } from "express";

import { userAuthenticated, userHasPermission } from "../../../auth/passport";
import { sendMailQueue } from "../../../queues/send-mail-queue";
import { serializeUser } from "../../../serializers/user";
import { getInstanceName } from "../../../utils/settings";

export default function () {
  const operations = {
    POST: [userAuthenticated, userHasPermission("admin"), POST],
  };

  async function POST(req: Request, res: Response, next: NextFunction) {
    const { content, sendToOption, sendTo, title } = req.body ?? {};
    try {
      let sendToUsers: { email: string }[] = [];

      if (sendToOption === "allArtists") {
        const users = await prisma.user.findMany({
          where: {
            receivePlatformEmails: true,
          },
          include: {
            profiles: true,
          },
        });
        sendToUsers = users.filter((u) => u.profiles.length > 0);
      } else if (sendToOption === "emails") {
        const emails = sendTo.replace(/\s+/, "").split(",");
        sendToUsers = await prisma.user.findMany({
          where: {
            receivePlatformEmails: true,
            email: {
              in: emails,
            },
          },
        });
      }

      const instanceName = await getInstanceName();

      await Promise.all(
        sendToUsers.map(async (user) => {
          await sendMailQueue.add("send-mail", {
            template: "admin-announcement",
            message: {
              to: user.email,
              subject: title ?? `${instanceName}: Platform Notice`,
            },
            locals: {
              email: user.email,
              user: serializeUser(user),
              content,
            },
          });
        })
      );
      return res.status(200).json({
        result: {
          sentTo: sendToUsers.length,
        },
      });
    } catch (e) {
      next(e);
    }
  }

  return operations;
}
