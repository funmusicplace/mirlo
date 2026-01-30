import { NextFunction, Request, Response } from "express";
import { getSiteSettings } from "../../../utils/settings";
import prisma from "@mirlo/prisma";
import { AppError } from "../../../utils/error";

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

      if (
        setting === "instanceArtist" &&
        settings.settings?.instanceCustomization?.artistId
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
