import { NextFunction, Request, Response } from "express";
import { userAuthenticated, userHasPermission } from "../../../auth/passport";
import { getSiteSettings } from "../../../utils/settings";
import prisma from "@mirlo/prisma";

export default function () {
  const operations = {
    GET: [userAuthenticated, userHasPermission("admin"), GET],
    POST: [userAuthenticated, userHasPermission("admin"), POST],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    try {
      const settings = await getSiteSettings();
      return res.status(200).json({ result: settings });
    } catch (e) {
      next(e);
    }
  }

  async function POST(req: Request, res: Response, next: NextFunction) {
    const { settings, terms, privacyPolicy, cookiePolicy, contentPolicy } =
      req.body;
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
      await prisma.settings.update({
        data: {
          settings,
          terms,
          privacyPolicy,
          cookiePolicy,
          contentPolicy,
        },
        where: {
          id: existingSettings.id,
        },
      });
      const refreshedSettings = await prisma.settings.findFirst();
      return res.status(200).json({ result: refreshedSettings });
    } catch (e) {
      next(e);
    }
  }

  return operations;
}
