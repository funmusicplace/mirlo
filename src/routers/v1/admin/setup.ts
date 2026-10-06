import prisma from "@mirlo/prisma";
import { NextFunction, Request, Response } from "express";

import { userAuthenticated, userHasPermission } from "../../../auth/passport";
import { serializeInstanceSettings } from "../../../serializers/instanceSettings";
import { AppError } from "../../../utils/error";
import { clearPageCache } from "../../../utils/pageCache";
import { getSiteSettings } from "../../../utils/settings";
import { getAvailableLanguages } from "../../../utils/transifexLanguages";

const trimmedString = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() ? value.trim() : undefined;

export default function () {
  const operations = {
    POST: [userAuthenticated, userHasPermission("admin"), POST],
  };

  async function POST(req: Request, res: Response, next: NextFunction) {
    const { name, supportEmail, colors } = req.body;
    try {
      const title = trimmedString(name);
      if (!title) {
        throw new AppError({
          httpCode: 400,
          description: "An instance name is required",
        });
      }
      const email = trimmedString(supportEmail);
      const button = trimmedString(colors?.button);
      const buttonText = trimmedString(colors?.buttonText);

      const current = await getSiteSettings();
      const existing = current.settings ?? {
        platformPercent: current.platformPercent,
      };
      const customization = existing.instanceCustomization ?? {};

      await prisma.settings.update({
        where: { id: current.id },
        data: {
          settings: {
            ...existing,
            instanceCustomization: {
              ...customization,
              title,
              ...(email && { supportEmail: email }),
              colors: {
                ...customization.colors,
                ...(button && { button }),
                ...(buttonText && { buttonText }),
              },
            },
          },
        },
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
    summary: "Saves the answers of the first launch screens",
    description:
      "Sets the instance name, and optionally the contact email and the button colours, without touching any other setting. Returns the public instance settings.",
    parameters: [
      {
        in: "body",
        name: "setup",
        required: true,
        schema: {
          type: "object",
          required: ["name"],
          properties: {
            name: { type: "string" },
            supportEmail: { type: "string" },
            colors: {
              type: "object",
              properties: {
                button: { type: "string" },
                buttonText: { type: "string" },
              },
            },
          },
        },
      },
    ],
    responses: {
      200: {
        description: "The public instance settings after the update",
      },
      400: {
        description: "The instance name is missing",
      },
    },
  };

  return operations;
}
