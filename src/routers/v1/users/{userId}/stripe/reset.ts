import bcrypt from "bcryptjs";
import { NextFunction, Request, Response } from "express";

import prisma from "@mirlo/prisma";

import { assertLoggedIn } from "../../../../../auth/getLoggedInUser";
import { userAuthenticated } from "../../../../../auth/passport";
import logger from "../../../../../logger";
import { AppError, HttpCode } from "../../../../../utils/error";

type Params = {
  userId: string;
};

/**
 * POST /v1/users/{userId}/stripe/reset
 *
 * Clears the user's stored stripeAccountId so they can re-run the Connect
 * onboarding flow. Needed when the user has deleted/disconnected their Stripe
 * account out-of-band — without this, the stale ID makes every subsequent
 * "Set up bank account" attempt fail because Stripe rejects calls against the
 * missing account. See #2085.
 *
 * Requires the user's password and email in the body. Emailing is gated by
 * verifying the body's email matches the logged-in user's, so a leaked
 * session can't quietly reset Stripe.
 */
export default function () {
  const operations = {
    POST: [userAuthenticated, POST],
  };

  async function POST(req: Request, res: Response, next: NextFunction) {
    const { userId } = req.params as unknown as Params;
    const { password, email } = req.body as {
      password?: string;
      email?: string;
    };
    assertLoggedIn(req);
    const loggedInUser = req.user;

    try {
      if (Number(userId) !== Number(loggedInUser.id)) {
        throw new AppError({
          httpCode: HttpCode.UNAUTHORIZED,
          description: "Can only reset your own Stripe account",
        });
      }

      if (!password || typeof password !== "string") {
        throw new AppError({
          httpCode: HttpCode.BAD_REQUEST,
          description: "Password is required to reset Stripe account",
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

      if (
        typeof email !== "string" ||
        email.trim().toLowerCase() !== user.email.toLowerCase()
      ) {
        throw new AppError({
          httpCode: HttpCode.UNAUTHORIZED,
          description: "Email confirmation did not match",
        });
      }

      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        throw new AppError({
          httpCode: HttpCode.UNAUTHORIZED,
          description: "Wrong password",
        });
      }

      if (!user.stripeAccountId) {
        // Nothing to clear — treat as a no-op so the UI can stay simple.
        return res.json({ result: { stripeAccountId: null } });
      }

      logger.info(
        `stripe/reset: clearing stripeAccountId for user ${user.id} (was ${user.stripeAccountId})`
      );

      const updated = await prisma.user.update({
        where: { id: user.id },
        data: { stripeAccountId: null },
        select: { stripeAccountId: true },
      });

      return res.json({ result: updated });
    } catch (e) {
      next(e);
    }
  }

  POST.apiDoc = {
    summary:
      "Clears the user's stored Stripe account id so they can reconnect from scratch",
    parameters: [
      {
        in: "path",
        name: "userId",
        required: true,
        type: "string",
      },
      {
        in: "body",
        name: "credentials",
        required: true,
        schema: {
          type: "object",
          required: ["password", "email"],
          properties: {
            password: { type: "string" },
            email: { type: "string" },
          },
        },
      },
    ],
    responses: {
      200: {
        description: "Stripe account id cleared",
      },
      default: {
        description: "An error occurred",
        schema: { additionalProperties: true },
      },
    },
  };

  return operations;
}
