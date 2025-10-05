import { NextFunction, Request, Response } from "express";
import prisma from "@mirlo/prisma";
import { randomUUID } from "crypto";
import logger from "../../logger";
import { AppError } from "../../utils/error";
import {
  normalizeAccountType,
  sendVerificationEmail,
} from "./sendVerificationEmail";

const RESEND_EXPIRATION_MINUTES = 20;

const resendVerificationEmail = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    let { email, client: clientURL, accountType } = req.body ?? {};

    if (!email || !clientURL) {
      throw new AppError({
        httpCode: 400,
        description: "Email and client must be supplied",
      });
    }

    email = email.toLowerCase().trim();
    const accountTypeValue = normalizeAccountType(accountType);

    const user = await prisma.user.findFirst({
      where: {
        email,
      },
      select: {
        id: true,
        email: true,
        name: true,
        currency: true,
        receiveMailingList: true,
        emailConfirmationToken: true,
        emailConfirmationExpiration: true,
      },
    });

    if (!user || !user.emailConfirmationToken) {
      throw new AppError({
        httpCode: 400,
        description: "User does not require email verification",
      });
    }

    const client = await prisma.client.findFirst({
      where: {
        applicationUrl: clientURL,
      },
    });

    if (!client) {
      return res.status(400).json({ error: "This client does not exist " });
    }

    const updatedUser = await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        emailConfirmationToken: randomUUID(),
        emailConfirmationExpiration: new Date(
          Date.now() + RESEND_EXPIRATION_MINUTES * 60 * 1000
        ),
      },
      select: {
        id: true,
        email: true,
        name: true,
        currency: true,
        receiveMailingList: true,
        emailConfirmationToken: true,
        emailConfirmationExpiration: true,
      },
    });

    logger.info(
      `auth/resendVerificationEmail: sending verification email ${updatedUser.email}`
    );

    await sendVerificationEmail({
      user: updatedUser,
      clientId: client.id,
      accountType: accountTypeValue,
    });

    return res
      .status(200)
      .json({
        message: "Success! Verification email sent.",
        emailConfirmationExpiresAt:
          updatedUser.emailConfirmationExpiration?.toISOString() ?? null,
      });
  } catch (error) {
    next(error);
  }
};

export default resendVerificationEmail;
