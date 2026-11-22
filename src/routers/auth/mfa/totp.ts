import prisma from "@mirlo/prisma";
import { NextFunction, Request, Response, Router } from "express";
import QRCode from "qrcode";

import { AppError } from "../../../utils/error";
import {
  generateTotpSecret,
  matchTotpStep,
  totpUri,
} from "../../../utils/mfa/totp";
import { sendSecurityAlert } from "../../../utils/securityAlerts";
import { getSiteSettings, resolveInstanceName } from "../../../utils/settings";

import {
  assertCanChangeFactors,
  assertNotLastFactor,
  assertVerified,
  codeFromBody,
  factorCount,
  finishEnrollment,
  loadAdminAccount,
  markVerified,
  secondFactorAttemptLimiter,
} from "./account";

const router = Router();

const codeDidNotMatch = () =>
  new AppError({ httpCode: 400, description: "That code didn't match" });

router.post(
  "/setup",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const account = await loadAdminAccount(req);
      assertCanChangeFactors(req, account);
      if (account.totpSecret) {
        throw new AppError({
          httpCode: 400,
          description: "An authenticator app is already set up",
        });
      }
      const secret = generateTotpSecret();
      await prisma.user.update({
        where: { id: account.id },
        data: { totpPendingSecret: secret },
      });
      const otpauthUrl = totpUri(
        secret,
        account.email,
        resolveInstanceName(await getSiteSettings())
      );
      res.json({
        result: {
          secret,
          otpauthUrl,
          qrCode: await QRCode.toDataURL(otpauthUrl),
        },
      });
    } catch (e) {
      next(e);
    }
  }
);

router.post(
  "/enable",
  secondFactorAttemptLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const account = await loadAdminAccount(req);
      assertCanChangeFactors(req, account);
      const code = codeFromBody(req);
      const secret = account.totpPendingSecret;
      if (!secret) {
        throw new AppError({
          httpCode: 400,
          description: "Start setting up the authenticator app first",
        });
      }
      const step = matchTotpStep(secret, code, null);
      if (step === null) {
        throw codeDidNotMatch();
      }
      await prisma.user.update({
        where: { id: account.id },
        data: {
          totpSecret: secret,
          totpPendingSecret: null,
          totpLastUsedStep: step,
        },
      });
      const recoveryCodes = await finishEnrollment(
        res,
        account,
        factorCount(account) === 0
      );
      await sendSecurityAlert(req, "authenticatorEnabled", {});
      res.json({ result: { recoveryCodes } });
    } catch (e) {
      next(e);
    }
  }
);

router.post(
  "/verify",
  secondFactorAttemptLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const account = await loadAdminAccount(req);
      const code = codeFromBody(req);
      if (!account.totpSecret) {
        throw new AppError({
          httpCode: 400,
          description: "No authenticator app is set up",
        });
      }
      const step = matchTotpStep(
        account.totpSecret,
        code,
        account.totpLastUsedStep
      );
      if (step === null) {
        throw codeDidNotMatch();
      }
      const { count } = await prisma.user.updateMany({
        where: {
          id: account.id,
          OR: [{ totpLastUsedStep: null }, { totpLastUsedStep: { lt: step } }],
        },
        data: { totpLastUsedStep: step },
      });
      if (count !== 1) {
        throw codeDidNotMatch();
      }
      markVerified(res, account);
      res.json({ result: { verified: true } });
    } catch (e) {
      next(e);
    }
  }
);

router.delete("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    assertVerified(req);
    const account = await loadAdminAccount(req);
    if (!account.totpSecret) {
      throw new AppError({
        httpCode: 404,
        description: "No authenticator app is set up",
      });
    }
    assertNotLastFactor(account);
    await prisma.user.update({
      where: { id: account.id },
      data: {
        totpSecret: null,
        totpPendingSecret: null,
        totpLastUsedStep: null,
      },
    });
    await sendSecurityAlert(req, "authenticatorDisabled", {});
    res.json({ result: { removed: true } });
  } catch (e) {
    next(e);
  }
});

export default router;
