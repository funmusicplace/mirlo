import { NextFunction, Request, Response } from "express";
import { userAuthenticated, userHasPermission } from "../../../auth/passport";
import prisma from "@mirlo/prisma";
import { sendMailQueue } from "../../../queues/send-mail-queue";

export default function () {
  const operations = {
    POST: [userAuthenticated, userHasPermission("admin"), POST],
  };

  async function POST(req: Request, res: Response, next: NextFunction) {
    const { content } = req.body;
    try {
      const users = await prisma.user.findMany({
        where: {
          receivePlatformEmails: true,
        },
        include: {
          artists: true,
        },
      });
      const usersWithArtists = users.filter((u) => u.artists.length > 0);

      await Promise.all(
        usersWithArtists.map(async (user) => {
          await sendMailQueue.add("send-mail", {
            template: "admin-announcement",
            message: {
              to: user.email,
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
          sentTo: usersWithArtists.length,
        },
      });
    } catch (e) {
      next(e);
    }
  }

  return operations;
}
