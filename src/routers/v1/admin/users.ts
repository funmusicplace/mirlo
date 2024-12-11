import { NextFunction, Request, Response } from "express";
import prisma from "@mirlo/prisma";
import { userAuthenticated, userHasPermission } from "../../../auth/passport";
import { uniqBy } from "lodash";

export default function () {
  const operations = {
    POST: [userAuthenticated, userHasPermission("admin"), POST],
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

  return operations;
}
