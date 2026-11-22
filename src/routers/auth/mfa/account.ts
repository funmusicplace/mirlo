import prisma from "@mirlo/prisma";
import { Request, Response } from "express";
import { rateLimit } from "express-rate-limit";

import { AppError } from "../../../utils/error";
import { replaceRecoveryCodes } from "../../../utils/mfa/recoveryCodes";
import { setTokens } from "../utils";

export const loadAdminAccount = async (req: Request) => {
  const account = req.user
    ? await prisma.user.findFirst({
        where: { id: req.user.id, isAdmin: true },
        omit: {
          totpSecret: false,
          totpPendingSecret: false,
          webauthnChallenge: false,
        },
        include: { webauthnCredentials: { orderBy: { createdAt: "asc" } } },
      })
    : null;
  if (!account) {
    throw new AppError({
      httpCode: 403,
      description: "Two-factor authentication is only for admin accounts",
    });
  }
  return account;
};

export type AdminAccount = Awaited<ReturnType<typeof loadAdminAccount>>;

export const factorCount = (account: AdminAccount) =>
  account.webauthnCredentials.length + (account.totpSecret ? 1 : 0);

export const assertVerified = (req: Request) => {
  if (!req.user?.isAdmin) {
    throw new AppError({
      httpCode: 403,
      code: "second_factor_required",
      description: "Verify with your security key or authenticator app first",
    });
  }
};

export const assertCanChangeFactors = (req: Request, account: AdminAccount) => {
  if (factorCount(account) > 0) {
    assertVerified(req);
  }
};

export const assertNotLastFactor = (account: AdminAccount) => {
  if (factorCount(account) < 2) {
    throw new AppError({
      httpCode: 400,
      description:
        "Add another security key or authenticator app before removing this one",
    });
  }
};

export const markVerified = (res: Response, account: AdminAccount) =>
  setTokens(res, account, Date.now());

export const finishEnrollment = async (
  res: Response,
  account: AdminAccount,
  wasFirstFactor: boolean
) => {
  if (!wasFirstFactor) {
    return undefined;
  }
  const recoveryCodes = await replaceRecoveryCodes(account.id);
  markVerified(res, account);
  return recoveryCodes;
};

export const consumeWebAuthnChallenge = async (account: AdminAccount) => {
  const challenge = account.webauthnChallenge;
  const { count } = challenge
    ? await prisma.user.updateMany({
        where: { id: account.id, webauthnChallenge: challenge },
        data: { webauthnChallenge: null },
      })
    : { count: 0 };
  if (!challenge || count !== 1) {
    throw new AppError({
      httpCode: 400,
      description: "That request expired, please try again",
    });
  }
  return challenge;
};

export const codeFromBody = (req: Request) => {
  const { code } = req.body ?? {};
  if (typeof code !== "string" || code.length > 64) {
    throw new AppError({ httpCode: 400, description: "A code is required" });
  }
  return code;
};

export const secondFactorAttemptLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => `mfa:${req.user?.id}`,
  skip: () => process.env.NODE_ENV === "test",
});
