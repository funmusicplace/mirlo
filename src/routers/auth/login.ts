import { NextFunction, Request, Response } from "express";
import prisma from "@mirlo/prisma";
import bcrypt from "bcryptjs";

const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(401).json({
        error: "Incorrect username or password",
      });
      return next();
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
        res.status(401).json({
          error: "Incorrect username or password",
        });
      }
    } else {
      res.status(401).json({
        error: "Incorrect username or password",
      });
    }
  } catch (error) {
    next(error);
  }
};

export default login;
