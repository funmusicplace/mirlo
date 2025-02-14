import { Request, Response } from "express";
import { Prisma, User } from "@mirlo/prisma/client";

import { userAuthenticated, userHasPermission } from "../../../auth/passport";
import prisma from "@mirlo/prisma";

export default function () {
  const operations = {
    GET: [userAuthenticated, userHasPermission("admin"), GET],
  };

  async function GET(req: Request, res: Response) {
    const {
      skip: skipQuery,
      take,
      email,
    } = req.query as {
      skip: string;
      take: string;
      email: string;
    };
    let where: Prisma.UserWhereInput = {};

    if (email) {
      where = {
        email: {
          contains: email,
          mode: "insensitive",
        },
      };
    }

    const itemCount = await prisma.user.count({ where });

    const users = await prisma.user.findMany({
      where,
      select: {
        artists: {
          where: {
            deletedAt: null,
          },
        },
        email: true,
      },
      skip: skipQuery ? Number(skipQuery) : undefined,
      take: take ? Number(take) : undefined,
      orderBy: {
        createdAt: "desc",
      },
    });
    res.json({ results: users, total: itemCount });
  }
  return operations;
}
