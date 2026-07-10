import prisma from "@mirlo/prisma";
import { Request, Response } from "express";

import {
  userAuthenticated,
  userHasPermission,
} from "../../../../auth/passport";
import { serializeUser } from "../../../../serializers/user";

export default function () {
  const operations = {
    POST: [userAuthenticated, userHasPermission("admin"), POST],
  };

  async function POST(req: Request, res: Response) {
    const { userId } = req.params;
    await prisma.user.update({
      where: {
        id: Number(userId),
      },
      data: {
        emailConfirmationExpiration: null,
        emailConfirmationToken: null,
      },
    });

    const user = await prisma.user.findFirst({
      where: {
        id: Number(userId),
      },
      select: {
        profiles: true,
        email: true,
        name: true,
        stripeAccountId: true,
        currency: true,
        isAdmin: true,
      },
    });
    res.json({ result: user ? serializeUser(user) : user });
  }
  return operations;
}
