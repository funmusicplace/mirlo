import { Prisma, User } from "@mirlo/prisma/client";

import { NextFunction, Request, Response } from "express";
import prisma from "@mirlo/prisma";
import {
  userAuthenticated,
  userHasPermission,
} from "../../../../auth/passport";
import { uniqBy } from "lodash";
import { sendMailQueue } from "../../../../queues/send-mail-queue";

export default function () {
  const operations = {
    POST: [userAuthenticated, userHasPermission("admin"), POST],
    GET: [userAuthenticated, userHasPermission("admin"), GET],
  };

  async function POST(req: Request, res: Response, next: NextFunction) {
    const { users, inviteType } = req.body as {
      users: { email: string }[];
      inviteType: "ARTIST" | "LABEL" | "LISTENER";
    };
    const loggedInUser = req.user as User;
    try {
      const existingInvites = (
        await prisma.invite.findMany({
          where: { email: { in: users.map((s) => s.email) } },
          select: { email: true },
        })
      ).map((invite) => invite.email);
      const newUsers = users.filter(
        (user) => !existingInvites.includes(user.email)
      );
      const invites = await prisma.invite.createManyAndReturn({
        data: uniqBy(newUsers, "email").map((newUser) => {
          return {
            email: newUser.email,
            invitedById: loggedInUser.id,
            accountType: inviteType,
          };
        }),
        select: {
          invitedBy: {
            select: { name: true, email: true },
          },
          email: true,
          id: true,
          createdAt: true,
          accountType: true,
          token: true,
          message: true,
        },
      });

      invites.forEach(async (newUser) => {
        await sendMailQueue.add("send-mail", {
          template: "invite-email",
          message: {
            to: newUser.email,
          },
          locals: {
            ...newUser,
            email: encodeURIComponent(newUser.email),
            host: process.env.API_DOMAIN,
            client: process.env.REACT_APP_CLIENT_DOMAIN,
          },
        });
      });
      res.json({
        message: "success",
      });
    } catch (e) {
      next(e);
    }
  }

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { skip: skipQuery, take, email } = req.query;
    try {
      let where: Prisma.InviteWhereInput = {};

      if (email && typeof email === "string") {
        where.email = { contains: email, mode: "insensitive" };
      }

      const itemCount = await prisma.invite.count({ where });
      const invites = await prisma.invite.findMany({
        where,
        skip: skipQuery ? Number(skipQuery) : undefined,
        take: take ? Number(take) : undefined,
        orderBy: {
          createdAt: "desc",
        },
        select: {
          email: true,
          usedBy: { select: { email: true, name: true, id: true } },
          id: true,
          createdAt: true,
          invitedBy: { select: { email: true, name: true, id: true } },
          accountType: true,
          message: true,
          token: true,
          usedAt: true,
        },
      });
      res.json({
        results: invites,
        total: itemCount,
      });
    } catch (e) {
      next(e);
    }
  }

  return operations;
}
