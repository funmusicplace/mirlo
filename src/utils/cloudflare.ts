import { NextFunction, Request, Response } from "express";

import { AppError } from "./error";
import { getSiteSettings, SettingsType } from "./settings";

const getTurnstileSecret = (settings: SettingsType) =>
  settings.settings?.cloudflareTurnstileSecret ||
  process.env.CLOUDFLARE_TURNSTILE_API_SECRET;

export const isSpamProtectionConfigured = (settings: SettingsType) =>
  Boolean(
    getTurnstileSecret(settings) &&
    settings.settings?.cloudflareTurnstileSiteKey?.trim()
  );

const isDev = () =>
  process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test";

const CLOUDFLARE_VERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

const ROBOT_MESSAGE = "Sounds like a robot";

async function checkCloudFlareTurnstile(req: Request, skipIfNoSecret: boolean) {
  const secret = getTurnstileSecret(await getSiteSettings());
  if (!secret) {
    if (skipIfNoSecret) {
      return;
    }

    throw new AppError({
      httpCode: 500,
      description: "Spam protection is not configured",
    });
  }

  const token = req.body?.cfTurnstile;
  if (!token || typeof token !== "string") {
    throw new AppError({ httpCode: 400, description: ROBOT_MESSAGE });
  }

  const result = await fetch(CLOUDFLARE_VERIFY_URL, {
    body: JSON.stringify({
      secret,
      response: token,
      remoteip: req.get("cf-connecting-ip") ?? req.ip,
    }),
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  });

  const outcome = (await result.json()) as { success: boolean };
  if (!outcome.success) {
    throw new AppError({ httpCode: 400, description: ROBOT_MESSAGE });
  }
}

export const requireSpamChallenge =
  ({
    skip,
    skipIfNoSecret = false,
  }: {
    skip?: (req: Request) => boolean;
    skipIfNoSecret?: boolean;
  } = {}) =>
  async (req: Request, _res: Response, next: NextFunction) => {
    if (isDev() || skip?.(req)) {
      return next();
    }
    try {
      await checkCloudFlareTurnstile(req, skipIfNoSecret);
      next();
    } catch (e) {
      next(e);
    }
  };
