import { Request, Response } from "express";
import {
  userAuthenticated,
  userHasPermission,
} from "../../../../auth/passport";
import prisma from "@mirlo/prisma";

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
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    const { profiles, ...rest } = user;
    res.json({ result: { ...rest, artists: profiles } });
  }
  return operations;
}
