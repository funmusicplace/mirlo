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
      const settings = await getSiteSettings();

      const { setting } = req.params;

      if (
        setting === "instanceArtistId" &&
        settings.settings?.instanceArtistId
      ) {
        const artist = await prisma.artist.findFirst({
          where: {
            id: settings.settings.instanceArtistId,
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
      return res.status(200).json({ result: settings });
    } catch (e) {
      next(e);
    }
  }

  return operations;
}
