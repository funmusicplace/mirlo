import prisma from "@mirlo/prisma";
import { NextFunction, Request, Response } from "express";

import { userAuthenticated, userHasPermission } from "../../../auth/passport";
import { AppError } from "../../../utils/error";
import { setCdnUrl } from "../../../utils/images";
import { setBucketConfig, BucketConfig } from "../../../utils/minio";
import { clearPageCache } from "../../../utils/pageCache";
import { getSiteSettings } from "../../../utils/settings";
import { refreshStripeClient } from "../../../utils/stripe";
import { isTrustLevelNames } from "../../../utils/trustLevel";

export default function () {
  const operations = {
    GET: [userAuthenticated, userHasPermission("admin"), GET],
    POST: [userAuthenticated, userHasPermission("admin"), POST],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    try {
      const settings = await getSiteSettings();
      return res.status(200).json({ result: maskStripeKey(settings) });
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
      const storedTitle = (
        storedSettings.instanceCustomization as { title?: string } | undefined
      )?.title?.trim();
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
      const existingStripe = storedSettings.stripe as
        | Record<string, unknown>
        | undefined;
      const incomingStripeKey = (settings?.stripe?.key ?? "").trim();
      const incomingWebhookSecret = (
        settings?.stripe?.webhookConnectSigningSecret ?? ""
      ).trim();
      const mergedSettings = {
        ...storedSettings,
        ...settings,
        ...(typeof incomingTitle === "string" && {
          instanceCustomization: {
            ...settings.instanceCustomization,
            title: incomingTitle.trim(),
          },
        }),
        stripe: {
          ...existingStripe,
          ...(settings?.stripe ?? {}),
          key: incomingStripeKey || existingStripe?.key,
          webhookConnectSigningSecret:
            incomingWebhookSecret ||
            existingStripe?.webhookConnectSigningSecret,
        },
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
      }
      clearPageCache();
      const refreshedSettings = await getSiteSettings();
      return res.status(200).json({ result: maskStripeKey(refreshedSettings) });
    } catch (e) {
      next(e);
    }
  }

  return operations;
}

function maskStripeKey(settings: object) {
  const s = settings as Record<string, unknown>;
  const settingsJson = s.settings as Record<string, unknown> | null | undefined;
  const stripeJson = settingsJson?.stripe as
    | Record<string, unknown>
    | null
    | undefined;
  const result = {
    ...s,
    stripe: undefined,
    settings: settingsJson
      ? {
          ...settingsJson,
          stripe: {
            ...(stripeJson ?? {}),
            key: undefined,
            keyConfigured: !!stripeJson?.key,
            webhookConnectSigningSecret: undefined,
            webhookSecretConfigured: !!stripeJson?.webhookConnectSigningSecret,
          },
        }
      : settingsJson,
  };
  return result;
}
