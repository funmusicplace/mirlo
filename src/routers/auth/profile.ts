import prisma from "@mirlo/prisma";
import { NextFunction, Request, Response } from "express";

import { serializeLoggedInUser, userSelect } from "../../utils/user";

const profile = async (req: Request, res: Response, next: NextFunction) => {
  const { email, isAdmin } = req.user as { email: string; isAdmin: boolean };
  try {
    const foundUser = await prisma.user.findFirst({
      where: { email },
      select: userSelect,
    });

    res.status(200).json({
      result: foundUser
        ? {
            ...(await serializeLoggedInUser(foundUser)),
            isAdmin,
            needsAdminVerification: !req.oauth && foundUser.isAdmin && !isAdmin,
          }
        : null,
    });
  } catch (e) {
    next(e);
  }
};

export default profile;
