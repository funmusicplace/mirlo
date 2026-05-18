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
 * Requires:
 *   - logged-in user matches the {userId} in the path
 *   - the user's current password
 *   - a 6-digit verification code that was just emailed to the user via
 *     POST /users/{userId}/stripe/resetCode
 *
 * The code is the 2FA element — it proves the requester still controls the
 * inbox associated with the account, not just the password (which could leak
 * or be reused from another breach).
 */
export default function () {
  const operations = {
    POST: [userAuthenticated, POST],
  };

  async function POST(req: Request, res: Response, next: NextFunction) {
    const { userId } = req.params as unknown as Params;
    const { password, code } = req.body as {
      password?: string;
      code?: string;
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

      const normalizedCode =
        typeof code === "string" ? code.trim().replace(/\s+/g, "") : "";
      if (!normalizedCode) {
        throw new AppError({
          httpCode: HttpCode.BAD_REQUEST,
          description:
            "Verification code is required. Request one via /resetCode first.",
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

      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        throw new AppError({
          httpCode: HttpCode.UNAUTHORIZED,
          description: "Wrong password",
        });
      }

      if (
        !user.userConfirmationCode ||
        !user.userConfirmationCodeExpiration ||
        user.userConfirmationCodeExpiration < new Date() ||
        user.userConfirmationCode !== normalizedCode
      ) {
        throw new AppError({
          httpCode: HttpCode.UNAUTHORIZED,
          description: "Invalid or expired verification code",
        });
      }

      if (!user.stripeAccountId) {
        // Nothing to clear — still consume the code so it can't be reused.
        await prisma.user.update({
          where: { id: user.id },
          data: {
            userConfirmationCode: null,
            userConfirmationCodeExpiration: null,
          },
        });
        return res.json({ result: { stripeAccountId: null } });
      }

      logger.info(
        `stripe/reset: clearing stripeAccountId for user ${user.id} (was ${user.stripeAccountId})`
      );

      const updated = await prisma.user.update({
        where: { id: user.id },
        data: {
          stripeAccountId: null,
          userConfirmationCode: null,
          userConfirmationCodeExpiration: null,
        },
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
          required: ["password", "code"],
          properties: {
            password: { type: "string" },
            code: {
              type: "string",
              description:
                "6-digit verification code emailed via /resetCode endpoint",
            },
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
