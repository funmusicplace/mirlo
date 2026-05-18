import { Job } from "bullmq";
import { randomInt } from "crypto";
import { NextFunction, Request, Response } from "express";

import prisma from "@mirlo/prisma";

import { assertLoggedIn } from "../../../../../auth/getLoggedInUser";
import { userAuthenticated } from "../../../../../auth/passport";
import { sendMail } from "../../../../../jobs/send-mail";
import logger from "../../../../../logger";
import { AppError, HttpCode } from "../../../../../utils/error";

type Params = {
  userId: string;
};

const CODE_EXPIRATION_MS = 15 * 60 * 1000; // 15 minutes

const generateCode = () =>
  randomInt(0, 1_000_000).toString().padStart(6, "0");

/**
 * POST /v1/users/{userId}/stripe/resetCode
 *
 * Sends a 6-digit verification code to the user's email so they can prove
 * they control the inbox before clearing their stripeAccountId. The receiving
 * endpoint POST /users/{userId}/stripe/reset requires this code along with
 * the user's password. See #2085 (PR feedback).
 */
export default function () {
  const operations = {
    POST: [userAuthenticated, POST],
  };

  async function POST(req: Request, res: Response, next: NextFunction) {
    const { userId } = req.params as unknown as Params;
    assertLoggedIn(req);
    const loggedInUser = req.user;

    try {
      if (Number(userId) !== Number(loggedInUser.id)) {
        throw new AppError({
          httpCode: HttpCode.UNAUTHORIZED,
          description: "Can only reset your own Stripe account",
        });
      }

      const user = await prisma.user.findUnique({
        where: { id: Number(userId) },
      });
      if (!user) {
        throw new AppError({
          httpCode: HttpCode.NOT_FOUND,
          description: "User not found",
        });
      }

      const code = generateCode();
      const expiration = new Date(Date.now() + CODE_EXPIRATION_MS);

      await prisma.user.update({
        where: { id: user.id },
        data: {
          userConfirmationCode: code,
          userConfirmationCodeExpiration: expiration,
        },
      });

      logger.info(
        `stripe/resetCode: emailing reset code to user ${user.id}`
      );

      await sendMail({
        data: {
          template: "stripe-reset-code",
          message: { to: user.email },
          locals: { code },
        },
      } as Job);

      return res.json({ result: { sent: true } });
    } catch (e) {
      next(e);
    }
  }

  POST.apiDoc = {
    summary: "Emails a 2FA code to start the Stripe account reset flow",
    parameters: [
      {
        in: "path",
        name: "userId",
        required: true,
        type: "string",
      },
    ],
    responses: {
      200: { description: "Verification code emailed" },
      default: {
        description: "An error occurred",
        schema: { additionalProperties: true },
      },
    },
  };

  return operations;
}
