import { NextFunction, Request, Response, Router } from "express";

import { siteUserAuthenticated } from "../../../auth/passport";
import { AppError } from "../../../utils/error";
import {
  countRecoveryCodes,
  redeemRecoveryCode,
  replaceRecoveryCodes,
} from "../../../utils/mfa/recoveryCodes";
import { secondFactorVerifiedUntil } from "../../../utils/mfa/session";
import { sendSecurityAlert } from "../../../utils/securityAlerts";

import {
  assertVerified,
  codeFromBody,
  factorCount,
  loadAdminAccount,
  markVerified,
  secondFactorAttemptLimiter,
} from "./account";
import totp from "./totp";
import webauthn from "./webauthn";

const router = Router();

router.use(siteUserAuthenticated);

router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const account = await loadAdminAccount(req);
    res.json({
      result: {
        verified: !!req.user?.isAdmin,
        verifiedUntil: secondFactorVerifiedUntil(req.user?.mfaAt),
        hasFactors: factorCount(account) > 0,
        totpEnabled: !!account.totpSecret,
        recoveryCodesRemaining: await countRecoveryCodes(account.id),
        securityKeys: account.webauthnCredentials.map(
          ({ id, name, createdAt, lastUsedAt }) => ({
            id,
            name,
            createdAt,
            lastUsedAt,
          })
        ),
      },
    });
  } catch (e) {
    next(e);
  }
});

router.post(
  "/recovery",
  secondFactorAttemptLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const account = await loadAdminAccount(req);
      const code = codeFromBody(req);
      if (
        factorCount(account) === 0 ||
        !(await redeemRecoveryCode(account.id, code))
      ) {
        throw new AppError({
          httpCode: 400,
          description: "That recovery code didn't work",
        });
      }
      markVerified(res, account);
      const recoveryCodesRemaining = await countRecoveryCodes(account.id);
      await sendSecurityAlert(req, "recoveryCodeUsed", {
        remaining: recoveryCodesRemaining,
      });
      res.json({ result: { verified: true, recoveryCodesRemaining } });
    } catch (e) {
      next(e);
    }
  }
);

router.post(
  "/recovery-codes",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      assertVerified(req);
      const account = await loadAdminAccount(req);
      const recoveryCodes = await replaceRecoveryCodes(account.id);
      await sendSecurityAlert(req, "recoveryCodesRegenerated", {});
      res.json({ result: { recoveryCodes } });
    } catch (e) {
      next(e);
    }
  }
);

router.use("/webauthn", webauthn);
router.use("/totp", totp);

export default router;
