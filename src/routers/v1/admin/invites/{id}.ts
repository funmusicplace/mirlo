import { Prisma } from "@mirlo/prisma/client";

import { NextFunction, Request, Response } from "express";
import prisma from "@mirlo/prisma";
import {
  userAuthenticated,
  userHasPermission,
} from "../../../../auth/passport";

export default function () {
  const operations = {
    PUT: [userAuthenticated, userHasPermission("admin"), PUT],
  };

  async function PUT(req: Request, res: Response, next: NextFunction) {
    const { email } = req.body as { email: string };
    try {
      await prisma.invite.update({
        where: { id: req.params.id },
        data: {
          email,
        },
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
