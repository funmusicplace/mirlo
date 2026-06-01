import prisma from "@mirlo/prisma";
import { NextFunction, Request, Response } from "express";

import { AppError } from "../../../utils/error";
import { processSingleArtist } from "../../../utils/serialize/artist";
import { getSiteSettings } from "../../../utils/settings";

export default function () {
  const operations = {
    GET: [GET],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    try {
      const { setting } = req.params;

      const okaySettings = [
        "instanceArtist",
        "privacyPolicy",
        "terms",
        "cookiePolicy",
        "contentPolicy",
        "isClosedToPublicArtistSignup",
        "platformPercent",
        "featuredArtists",
        "instanceCustomization.title",
        "instanceCustomization.supportEmail",
        "instanceCustomization.artistId",
        "instanceCustomization.purchaseEmail",
        "instanceCustomization.showHeroOnHome",
        "instanceCustomization.colors",
      ];

      if (!okaySettings.includes(setting)) {
        throw new AppError({
          httpCode: 404,
          description: "Page not found",
        });
      }
      const settings = await getSiteSettings();
      if (setting.includes("instanceCustomization.")) {
        const key = setting.split(".")[1];
        return res.status(200).json({
          result: settings.settings?.instanceCustomization
            ? settings.settings.instanceCustomization[
                key as keyof typeof settings.settings.instanceCustomization
              ]
            : undefined,
        });
      }

      if (setting === "featuredArtists") {
        const settingsJson = settings.settings as
          | Record<string, unknown>
          | null
          | undefined;
        const featuredArtistIds = settingsJson?.featuredArtistIds as
          | number[]
          | undefined;
        if (!featuredArtistIds?.length) {
          return res.status(200).json({ result: [] });
        }
        const artists = await prisma.artist.findMany({
          where: { id: { in: featuredArtistIds }, deletedAt: null },
          include: {
            avatar: { where: { deletedAt: null } },
            background: { where: { deletedAt: null } },
          },
        });
        return res
          .status(200)
          .json({ result: artists.map(processSingleArtist) });
      } else if (
        setting === "instanceArtist" &&
        settings.settings?.instanceCustomization?.artistId &&
        Number.isFinite(
          Number(settings.settings.instanceCustomization.artistId)
        )
      ) {
        const artist = await prisma.artist.findFirst({
          where: {
            id: Number(settings.settings.instanceCustomization?.artistId),
          },
        });
        return res.status(200).json({ result: artist });
      } else if (setting === "terms") {
        if (!settings.terms) {
          throw new AppError({ httpCode: 404, description: "No terms found" });
        }
        return res.status(200).json({ result: settings.terms });
      } else if (setting === "privacyPolicy") {
        if (!settings.privacyPolicy) {
          throw new AppError({
            httpCode: 404,
            description: "No privacy policy found",
          });
        }
        return res.status(200).json({ result: settings.privacyPolicy });
      } else if (setting === "cookiePolicy") {
        if (!settings.cookiePolicy) {
          throw new AppError({
            httpCode: 404,
            description: "No cookie policy found",
          });
        }
        return res.status(200).json({ result: settings.cookiePolicy });
      } else if (setting === "contentPolicy") {
        if (!settings.contentPolicy) {
          throw new AppError({
            httpCode: 404,
            description: "No content policy found",
          });
        }
        return res.status(200).json({ result: settings.contentPolicy });
      }
      return res.status(200).json({
        result: Object.keys(settings).includes(setting)
          ? settings[setting as keyof typeof settings]
          : settings,
      });
    } catch (e) {
      next(e);
    }
  }

  return operations;
}
