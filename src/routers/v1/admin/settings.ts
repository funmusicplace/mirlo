import prisma from "@mirlo/prisma";
import { NextFunction, Request, Response } from "express";

import { userAuthenticated, userHasPermission } from "../../../auth/passport";
import { setCdnUrl } from "../../../utils/images";
import { setBucketConfig, BucketConfig } from "../../../utils/minio";
import { getSiteSettings } from "../../../utils/settings";
import { refreshStripeClient } from "../../../utils/stripe";

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
      const existingStripe = (
        existingSettings.settings as Record<string, unknown> | null
      )?.stripe as Record<string, unknown> | undefined;
      const incomingStripeKey = (settings?.stripe?.key ?? "").trim();
      const mergedSettings = {
        ...settings,
        stripe: {
          ...(settings?.stripe ?? {}),
          key: incomingStripeKey || existingStripe?.key,
        },
        featuredArtistIds: settings?.featuredArtistIds ?? [],
      };
      await prisma.settings.update({
        data: {
          settings: mergedSettings,
          terms,
          privacyPolicy,
          isClosedToPublicArtistSignup,
          cookiePolicy,
          contentPolicy,
          defconLevel: Number(defconLevel),
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
      const refreshedSettings = await getSiteSettings();
      return res.status(200).json({ result: refreshedSettings });
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
          },
        }
      : settingsJson,
  };
  return result;
}
