import { NextFunction, Request, Response } from "express";
import prisma from "@mirlo/prisma";
import { setTokens } from "./utils";
import { AppError } from "../../utils/error";
import logger from "../../logger";

const confirmEmailToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      token,
      userId,
      client: clientID,
      accountType,
    } = req.body as {
      token: string;
      userId: number;
      client: number;
      accountType: "artist" | "listener";
    };

    logger.info(`auth/confirmEmailToken: confirming email for user ${userId}`);

    if (!token || !userId || !clientID) {
      return next(
        new AppError({
          httpCode: 400,
          description: "Token, userId, and client are required",
        })
      );
    }

    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        emailConfirmationToken: token,
      },
    });

    if (!user) {
      return next(
        new AppError({
          httpCode: 404,
          description: "This user does not exist",
        })
      );
    }

    const client = await prisma.client.findFirst({
      where: {
        id: clientID,
      },
    });

    if (!client) {
      return next(
        new AppError({
          httpCode: 404,
          description: "This client does not exist",
        })
      );
    }

    if (
      user.emailConfirmationExpiration &&
      user.emailConfirmationExpiration < new Date()
    ) {
      return next(
        new AppError({
          httpCode: 400,
          description: "Token expired",
        })
      );
    }

    const updatedUser = await prisma.user.update({
      data: {
        emailConfirmationToken: null,
        emailConfirmationExpiration: null,
      },
      where: {
        id: user.id,
      },
      select: {
        email: true,
        id: true,
      },
    });

    setTokens(res, updatedUser);

    res.json({
      message: "Email confirmed successfully",
      userId: updatedUser.id,
      email: updatedUser.email,
      accountType,
    });
  } catch (e) {
    logger.error(`Error confirming email token: ${e}`);
    next(e);
  }
};

export default confirmEmailToken;
