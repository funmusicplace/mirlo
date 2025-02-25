import { NextFunction, Request, Response } from "express";
import { userAuthenticated, userHasPermission } from "../../../auth/passport";
import prisma from "@mirlo/prisma";
import { sendMailQueue } from "../../../queues/send-mail-queue";

export default function () {
  const operations = {
    POST: [userAuthenticated, userHasPermission("admin"), POST],
  };

  async function POST(req: Request, res: Response, next: NextFunction) {
    const { content, sendToOption, sendTo, title } = req.body;
    try {
      let sendToUsers: { email: string }[] = [];

      if (sendToOption === "allArtists") {
        const users = await prisma.user.findMany({
          where: {
            receivePlatformEmails: true,
          },
          include: {
            artists: true,
          },
        });
        sendToUsers = users.filter((u) => u.artists.length > 0);
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

      await Promise.all(
        sendToUsers.map(async (user) => {
          await sendMailQueue.add("send-mail", {
            template: "admin-announcement",
            message: {
              to: user.email,
              subject: title ?? "Mirlo: Platform Notice",
            },
            locals: {
              email: user.email,
              user,
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
