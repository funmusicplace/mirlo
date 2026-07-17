import prisma from "@mirlo/prisma";
import bcrypt from "bcryptjs";
import { NextFunction, Request, Response } from "express";

import { AppError } from "../../utils/error";

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

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
      },
    });

    if (foundUser) {
      if (foundUser.lockedUntil && foundUser.lockedUntil > new Date()) {
        throw new AppError({
          httpCode: 429,
          description:
            "Too many failed login attempts. Please try again later.",
        });
      }

      const userIsVerified = foundUser.emailConfirmationToken == null;
      const match = await bcrypt.compare(password, foundUser.password);
      if (match) {
        if (userIsVerified) {
          if (foundUser.failedLoginAttempts > 0 || foundUser.lockedUntil) {
            await prisma.user.update({
              where: { id: foundUser.id },
              data: { failedLoginAttempts: 0, lockedUntil: null },
            });
          }
          res.locals.user = foundUser;
          next();
        } else {
          throw new AppError({
            httpCode: 401,
            description: "User is unverified",
          });
        }
      } else {
        const failedLoginAttempts = foundUser.failedLoginAttempts + 1;
        await prisma.user.update({
          where: { id: foundUser.id },
          data: {
            failedLoginAttempts,
            lockedUntil:
              failedLoginAttempts >= MAX_FAILED_ATTEMPTS
                ? new Date(Date.now() + LOCKOUT_DURATION_MS)
                : null,
          },
        });
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
