import prisma from "@mirlo/prisma";
import { NextFunction, Request, Response, Router } from "express";

import { AppError } from "../../../utils/error";
import {
  authenticationOptions,
  registrationOptions,
  verifyAuthentication,
  verifyRegistration,
} from "../../../utils/mfa/webauthn";
import { sendSecurityAlert } from "../../../utils/securityAlerts";
import { getSiteSettings, resolveInstanceName } from "../../../utils/settings";

import {
  assertCanChangeFactors,
  assertNotLastFactor,
  assertVerified,
  consumeWebAuthnChallenge,
  factorCount,
  finishEnrollment,
  loadAdminAccount,
  markVerified,
} from "./account";

const router = Router();

const responseFromBody = (req: Request) => {
  const { response } = req.body ?? {};
  if (!response || typeof response !== "object" || !response.id) {
    throw new AppError({
      httpCode: 400,
      description: "A security key response is required",
    });
  }
  return response;
};

router.post(
  "/registration-options",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const account = await loadAdminAccount(req);
      assertCanChangeFactors(req, account);
      const options = await registrationOptions(
        account,
        account.webauthnCredentials,
        resolveInstanceName(await getSiteSettings())
      );
      await prisma.user.update({
        where: { id: account.id },
        data: { webauthnChallenge: options.challenge },
      });
      res.json({ result: options });
    } catch (e) {
      next(e);
    }
  }
);

router.post(
  "/register",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const account = await loadAdminAccount(req);
      assertCanChangeFactors(req, account);
      const response = responseFromBody(req);
      const rawName = typeof req.body.name === "string" ? req.body.name : "";
      const name = rawName.trim().slice(0, 100) || "Security key";
      const challenge = await consumeWebAuthnChallenge(account);
      const credential = await verifyRegistration(response, challenge);
      if (!credential) {
        throw new AppError({
          httpCode: 400,
          description: "That security key couldn't be verified",
        });
      }
      await prisma.webAuthnCredential.create({
        data: { ...credential, name, userId: account.id },
      });
      const recoveryCodes = await finishEnrollment(
        res,
        account,
        factorCount(account) === 0
      );
      await sendSecurityAlert(req, "securityKeyAdded", { name });
      res.json({ result: { recoveryCodes } });
    } catch (e) {
      next(e);
    }
  }
);

router.post(
  "/authentication-options",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const account = await loadAdminAccount(req);
      if (account.webauthnCredentials.length === 0) {
        throw new AppError({
          httpCode: 400,
          description: "No security keys are set up",
        });
      }
      const options = await authenticationOptions(account.webauthnCredentials);
      await prisma.user.update({
        where: { id: account.id },
        data: { webauthnChallenge: options.challenge },
      });
      res.json({ result: options });
    } catch (e) {
      next(e);
    }
  }
);

router.post(
  "/authenticate",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const account = await loadAdminAccount(req);
      const response = responseFromBody(req);
      const stored = account.webauthnCredentials.find(
        (credential) => credential.credentialId === response.id
      );
      if (!stored) {
        throw new AppError({
          httpCode: 400,
          description: "That security key isn't registered",
        });
      }
      const challenge = await consumeWebAuthnChallenge(account);
      const newCounter = await verifyAuthentication(
        response,
        challenge,
        stored
      );
      if (newCounter === null) {
        throw new AppError({
          httpCode: 400,
          description: "That security key couldn't be verified",
        });
      }
      await prisma.webAuthnCredential.update({
        where: { id: stored.id },
        data: { counter: newCounter, lastUsedAt: new Date() },
      });
      markVerified(res, account);
      res.json({ result: { verified: true } });
    } catch (e) {
      next(e);
    }
  }
);

router.delete(
  "/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      assertVerified(req);
      const account = await loadAdminAccount(req);
      const credential = account.webauthnCredentials.find(
        ({ id }) => id === req.params.id
      );
      if (!credential) {
        throw new AppError({
          httpCode: 404,
          description: "Security key not found",
        });
      }
      assertNotLastFactor(account);
      await prisma.webAuthnCredential.delete({ where: { id: credential.id } });
      await sendSecurityAlert(req, "securityKeyRemoved", {
        name: credential.name,
      });
      res.json({ result: { removed: true } });
    } catch (e) {
      next(e);
    }
  }
);

export default router;
