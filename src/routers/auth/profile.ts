import prisma from "@mirlo/prisma";
import { NextFunction, Request, Response } from "express";

import { serializeUser } from "../../serializers/user";
import { userSelect } from "../../utils/user";

const profile = async (req: Request, res: Response, next: NextFunction) => {
  const { email } = req.user as { email: string };
  try {
    const foundUser = await prisma.user.findFirst({
      where: { email },
      select: userSelect,
    });

    res.status(200).json({
      result: foundUser ? serializeUser(foundUser) : null,
    });
  } catch (e) {
    next(e);
  }
};

export default profile;
