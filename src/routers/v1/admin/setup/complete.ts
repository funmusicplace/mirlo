import prisma from "@mirlo/prisma";
import { NextFunction, Request, Response } from "express";

import {
  userAuthenticated,
  userHasPermission,
} from "../../../../auth/passport";
import { serializeInstanceSettings } from "../../../../serializers/instanceSettings";
import { clearPageCache } from "../../../../utils/pageCache";
import { getSiteSettings } from "../../../../utils/settings";
import { getAvailableLanguages } from "../../../../utils/transifexLanguages";

export default function () {
  const operations = {
    POST: [userAuthenticated, userHasPermission("admin"), POST],
  };

  async function POST(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = await getSiteSettings();
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
      "Records when the setup guide was finished. The public instance settings then report the done stage. Returns them.",
    responses: {
      200: {
        description: "The public instance settings after the update",
      },
    },
  };

  return operations;
}
