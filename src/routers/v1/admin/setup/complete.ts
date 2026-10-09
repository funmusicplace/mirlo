import prisma from "@mirlo/prisma";
import { NextFunction, Request, Response } from "express";

import {
  userAuthenticated,
  userHasPermission,
} from "../../../../auth/passport";
import { serializeInstanceSettings } from "../../../../serializers/instanceSettings";
import { AppError } from "../../../../utils/error";
import { clearPageCache } from "../../../../utils/pageCache";
import { getSiteSettings, resolveSetupStage } from "../../../../utils/settings";
import { getAvailableLanguages } from "../../../../utils/transifexLanguages";

export default function () {
  const operations = {
    POST: [userAuthenticated, userHasPermission("admin"), POST],
  };

  async function POST(req: Request, res: Response, next: NextFunction) {
    try {
      const settings = await getSiteSettings();
      if (resolveSetupStage(settings) === "welcome") {
        throw new AppError({
          httpCode: 400,
          description:
            "The instance needs a name before its setup can be completed",
        });
      }
      const { id } = settings;
      await prisma.settings.update({
        where: { id },
        data: { setupCompletedAt: new Date() },
      });
      clearPageCache();

      return res.status(200).json({
        result: serializeInstanceSettings(
          await getSiteSettings(),
          getAvailableLanguages()
        ),
      });
    } catch (e) {
      next(e);
    }
  }

  POST.apiDoc = {
    summary: "Marks the instance setup as completed",
    description:
      "Records when the setup guide was finished. The public instance settings then report the done stage. Returns them. Refused while the instance has no name, since the first launch screens would never show again.",
    responses: {
      200: {
        description: "The public instance settings after the update",
      },
      400: {
        description: "The instance has no name yet",
      },
    },
  };

  return operations;
}
