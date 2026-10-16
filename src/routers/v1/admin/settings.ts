import prisma from "@mirlo/prisma";
import { NextFunction, Request, Response } from "express";

import { userAuthenticated, userHasPermission } from "../../../auth/passport";
import logger from "../../../logger";
import { isValidEmail } from "../../../utils/email";
import { AppError } from "../../../utils/error";
import { setCdnUrl } from "../../../utils/images";
import {
  setBucketConfig,
  BucketConfig,
  ensureAllBucketsExist,
} from "../../../utils/minio";
import { clearPageCache } from "../../../utils/pageCache";
import {
  getSiteSettings,
  resolveFromEmail,
  SettingsType,
} from "../../../utils/settings";
import { refreshStripeClient, stripeKeyMode } from "../../../utils/stripe";
import { isTrustLevelNames } from "../../../utils/trustLevel";

export default function () {
  const operations = {
    GET: [userAuthenticated, userHasPermission("admin"), GET],
    POST: [userAuthenticated, userHasPermission("admin"), POST],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    try {
      const settings = await getSiteSettings();
      return res
        .status(200)
        .json({ result: maskSecrets(withResolvedSender(settings)) });
    } catch (e) {
      next(e);
    }
  }

  async function POST(req: Request, res: Response, next: NextFunction) {
    const {
      settings,
      terms,
      privacyPolicy,
      cookiePolicy,
      contentPolicy,
      defconLevel,
      isClosedToPublicArtistSignup,
      showQueueDashboard,
      cdnUrl,
      bucketNames,
    } = req.body;
    try {
      if (
        settings?.trustLevelNames !== undefined &&
        !isTrustLevelNames(settings.trustLevelNames)
      ) {
        throw new AppError({
          httpCode: 400,
          description: "Invalid trust level names",
        });
      }
      let existingSettings = await prisma.settings.findFirst();
      if (!existingSettings) {
        existingSettings = await prisma.settings.create({
          data: {
            settings: {
              platformPercent: 7,
            },
          },
        });
      }
      const storedSettings =
        (existingSettings.settings as Record<string, unknown> | null) ?? {};
      const storedCustomization = storedSettings.instanceCustomization as
        | { title?: string; contactEmail?: unknown }
        | undefined;
      const storedTitle = storedCustomization?.title?.trim();
      const hasStoredContactEmail =
        typeof storedCustomization?.contactEmail === "string" &&
        storedCustomization.contactEmail.trim() !== "";
      const incomingTitle = settings?.instanceCustomization?.title;
      if (incomingTitle !== undefined && typeof incomingTitle !== "string") {
        throw new AppError({
          httpCode: 400,
          description: "The instance name must be a string",
        });
      }
      if (
        storedTitle &&
        settings &&
        "instanceCustomization" in settings &&
        !incomingTitle?.trim()
      ) {
        throw new AppError({
          httpCode: 400,
          description: "The instance name cannot be removed",
        });
      }
      const incomingContactEmail =
        settings?.instanceCustomization?.contactEmail;
      const incomingSupportEmail =
        settings?.instanceCustomization?.supportEmail;
      for (const [label, value] of [
        ["contact", incomingContactEmail],
        ["support", incomingSupportEmail],
      ]) {
        if (
          value !== undefined &&
          (typeof value !== "string" ||
            (value.trim() !== "" && !isValidEmail(value.trim())))
        ) {
          throw new AppError({
            httpCode: 400,
            description: `The ${label} email is not a valid email address`,
          });
        }
      }
      if (
        hasStoredContactEmail &&
        settings &&
        "instanceCustomization" in settings &&
        !incomingContactEmail?.trim()
      ) {
        throw new AppError({
          httpCode: 400,
          description: "The contact email cannot be removed",
        });
      }
      const existingStripe = storedSettings.stripe as
        | Record<string, unknown>
        | undefined;
      const incomingStripeKey = (settings?.stripe?.key ?? "").trim();
      const incomingWebhookSecret = (
        settings?.stripe?.webhookConnectSigningSecret ?? ""
      ).trim();
      const incomingTurnstileSecret = (
        settings?.cloudflareTurnstileSecret ?? ""
      ).trim();
      const mergedSettings = {
        ...storedSettings,
        ...settings,
        ...(settings?.instanceCustomization && {
          instanceCustomization: {
            ...settings.instanceCustomization,
            ...(typeof incomingTitle === "string" && {
              title: incomingTitle.trim(),
            }),
            ...(typeof incomingContactEmail === "string" && {
              contactEmail: incomingContactEmail.trim(),
            }),
            ...(typeof incomingSupportEmail === "string" && {
              supportEmail: incomingSupportEmail.trim(),
            }),
          },
        }),
        stripe: {
          ...existingStripe,
          ...(settings?.stripe ?? {}),
          key: incomingStripeKey || existingStripe?.key,
          webhookConnectSigningSecret:
            incomingWebhookSecret ||
            existingStripe?.webhookConnectSigningSecret,
          webhookEndpointId: existingStripe?.webhookEndpointId,
        },
        cloudflareTurnstileSecret:
          incomingTurnstileSecret || storedSettings.cloudflareTurnstileSecret,
      };
      await prisma.settings.update({
        data: {
          settings: mergedSettings,
          terms,
          privacyPolicy,
          isClosedToPublicArtistSignup,
          cookiePolicy,
          contentPolicy,
          ...(defconLevel !== undefined && {
            defconLevel: Number(defconLevel),
          }),
          showQueueDashboard,
          cdnUrl,
          ...(bucketNames !== undefined && { bucketNames }),
        },
        where: {
          id: existingSettings.id,
        },
      });
      setCdnUrl(cdnUrl ?? undefined);
      await refreshStripeClient();
      if (bucketNames !== undefined) {
        setBucketConfig((bucketNames as BucketConfig | null) ?? null);
        ensureAllBucketsExist().catch((e) => {
          logger.error("Failed to create storage buckets after settings save");
          logger.error(e);
        });
      }
      clearPageCache();
      const refreshedSettings = await getSiteSettings();
      return res
        .status(200)
        .json({ result: maskSecrets(withResolvedSender(refreshedSettings)) });
    } catch (e) {
      next(e);
    }
  }

  return operations;
}

function withResolvedSender(settings: SettingsType): SettingsType {
  const fromEmail = resolveFromEmail(settings);
  if (!settings.settings || !fromEmail) {
    return settings;
  }
  return {
    ...settings,
    settings: {
      ...settings.settings,
      emailProvider: {
        ...settings.settings.emailProvider,
        fromEmail,
      },
    },
  };
}

function maskSecrets(settings: object) {
  const s = settings as Record<string, unknown>;
  const settingsJson = s.settings as Record<string, unknown> | null | undefined;
  const stripeJson = settingsJson?.stripe as
    | Record<string, unknown>
    | null
    | undefined;
  const result = {
    ...s,
    stripe: undefined,
    cloudflareTurnstileSecret: undefined,
    settings: settingsJson
      ? {
          ...settingsJson,
          stripe: {
            ...(stripeJson ?? {}),
            key: undefined,
            keyConfigured: !!stripeJson?.key,
            keyMode: stripeKeyMode(stripeJson ?? undefined),
            webhookConnectSigningSecret: undefined,
            webhookSecretConfigured: !!stripeJson?.webhookConnectSigningSecret,
          },
          cloudflareTurnstileSecret: undefined,
          cloudflareTurnstileSecretConfigured:
            !!settingsJson.cloudflareTurnstileSecret,
        }
      : settingsJson,
  };
  return result;
}
