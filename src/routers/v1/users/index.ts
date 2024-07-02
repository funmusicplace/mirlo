import { Request, Response } from "express";
import { userAuthenticated, userHasPermission } from "../../../auth/passport";
import prisma from "@mirlo/prisma";

export default function () {
  const operations = {
    GET: [userAuthenticated, userHasPermission("admin"), GET],
  };

  async function GET(req: Request, res: Response) {
    const { skip: skipQuery, take } = req.query as {
      skip: string;
      take: string;
    };
    const itemCount = await prisma.trackGroup.count();

    const users = await prisma.user.findMany({
      include: {
        artists: {
          where: {
            deletedAt: null,
          },
        },
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
