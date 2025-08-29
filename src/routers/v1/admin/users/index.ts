import { Prisma } from "@mirlo/prisma/client";

import { NextFunction, Request, Response } from "express";
import prisma from "@mirlo/prisma";
import {
  userAuthenticated,
  userHasPermission,
} from "../../../../auth/passport";
import { uniqBy } from "lodash";

export default function () {
  const operations = {
    POST: [userAuthenticated, userHasPermission("admin"), POST],
    GET: [userAuthenticated, userHasPermission("admin"), GET],
  };

  async function POST(req: Request, res: Response, next: NextFunction) {
    const { users } = req.body as { users: { email: string }[] };
    try {
      const existingEmails = (
        await prisma.user.findMany({
          where: { email: { in: users.map((s) => s.email) } },
          select: { email: true },
        })
      ).map((user) => user.email);
      const newUsers = users.filter(
        (user) => !existingEmails.includes(user.email)
      );
      await prisma.user.createMany({
        data: uniqBy(newUsers, "email").map((newUser) => newUser),
      });
      res.json({
        message: "success",
      });
    } catch (e) {
      next(e);
    }
  }

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { skip: skipQuery, take, name, acceptPayments, email } = req.query;
    try {
      let where: Prisma.UserWhereInput = {
        deletedAt: null,
      };

      if (name && typeof name === "string") {
        where.name = { contains: name, mode: "insensitive" };
      }
      if (acceptPayments) {
        where.stripeAccountId = {
          not: null,
        };
      }
      if (email && typeof email === "string") {
        where.email = { contains: email, mode: "insensitive" };
      }
      const itemCount = await prisma.user.count({ where });
      const users = await prisma.user.findMany({
        where,
        skip: skipQuery ? Number(skipQuery) : undefined,
        take: take ? Number(take) : undefined,
        orderBy: {
          createdAt: "desc",
        },
        select: {
          email: true,
          name: true,
          id: true,
          createdAt: true,
          updatedAt: true,
          userAvatar: true,
          artists: true,
          isLabelAccount: true,
          featureFlags: true,
          emailConfirmationToken: true,
          currency: true,
          stripeAccountId: true,
          receiveMailingList: true,
          isAdmin: true,
        },
      });
      res.json({
        results: users,
        total: itemCount,
      });
    } catch (e) {
      next(e);
    }
  }

  return operations;
}
