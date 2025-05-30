import { NextFunction, Request, Response } from "express";
import prisma from "@mirlo/prisma";
import bcrypt from "bcryptjs";
import { AppError } from "../../utils/error";

const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body ?? {};
    if (!email || !password) {
      throw new AppError({
        httpCode: 401,
        description: "Missing log in information",
      });
    }
    const foundUser = await prisma.user.findFirst({
      where: {
        email: email.toLowerCase(),
        emailConfirmationToken: null,
      },
    });
    if (foundUser) {
      const match = await bcrypt.compare(password, foundUser.password);
      if (match) {
        res.locals.user = foundUser;
        next();
      } else {
        throw new AppError({
          httpCode: 401,
          description: "Incorrect username or password",
        });
      }
    } else {
      throw new AppError({
        httpCode: 401,
        description: "Incorrect username or password",
      });
    }
  } catch (error) {
    next(error);
  }
};

export default login;
