import { AppError } from "./error";
import { getSiteSettings, SettingsType } from "./settings";

const getTurnstileSecret = (settings: SettingsType) =>
  settings.settings?.cloudflareTurnstileSecret ||
  process.env.CLOUDFLARE_TURNSTILE_API_SECRET;

export const isSpamProtectionConfigured = (settings: SettingsType) =>
  Boolean(getTurnstileSecret(settings));

const isDev =
  process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test";

const CLOUDFLARE_VERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

type CheckTurnstileOptions = {
  token: unknown;
  ip?: unknown;
  missingTokenMessage?: string;
  failureMessage?: string;
  skipIfNoSecret?: boolean;
};

export async function checkCloudFlareTurnstile({
  token,
  ip,
  missingTokenMessage = "Spam protection challenge is required",
  failureMessage = "Spam protection failed",
  skipIfNoSecret = false,
}: CheckTurnstileOptions) {
  if (isDev) {
    // TBD if this is desirable--kind of prevents tests from being written for it.
    return;
  }
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

  if (!token || typeof token !== "string") {
    throw new AppError({
      httpCode: 400,
      description: missingTokenMessage,
    });
  }

  const result = await fetch(CLOUDFLARE_VERIFY_URL, {
    body: JSON.stringify({
      secret,
      response: token,
      remoteip: ip,
    }),
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  });

  const outcome = (await result.json()) as { success: boolean };
  if (!outcome.success) {
    throw new AppError({
      httpCode: 400,
      description: failureMessage,
    });
  }
}
