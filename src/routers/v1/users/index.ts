import { Request, Response } from "express";
import { userAuthenticated, userHasPermission } from "../../../auth/passport";
import prisma from "../../../../prisma/prisma";

export default function () {
  const operations = {
    GET: [userAuthenticated, userHasPermission("admin"), GET],
  };

  async function GET(req: Request, res: Response) {
    const users = await prisma.user.findMany({
      include: {
        artists: {
          where: {
            deletedAt: null,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    res.json({ results: users });
  }
  return operations;
}
