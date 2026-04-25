import prisma from "@mirlo/prisma";
import { NextFunction, Request, Response } from "express";

import {
  USER_PROFILE_SELECT,
  serializeUserProfile,
} from "../../utils/serialize/userProfile";

const profile = async (req: Request, res: Response, next: NextFunction) => {
  const { email } = req.user as { email: string };
  try {
    const foundUser = await prisma.user.findFirst({
      where: { email },
      select: USER_PROFILE_SELECT,
    });

    res.status(200).json({
      result: foundUser ? serializeUserProfile(foundUser) : null,
    });
  } catch (e) {
    next(e);
  }
};

export default profile;
