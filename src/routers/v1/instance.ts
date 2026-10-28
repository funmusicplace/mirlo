import { NextFunction, Request, Response } from "express";

import { serializeInstanceSettings } from "../../serializers/instanceSettings";
import { getSiteSettings } from "../../utils/settings";
import { SPLASH_TEXT_POSITIONS } from "../../utils/splashScreen";
import { getAvailableLanguages } from "../../utils/transifexLanguages";

export default function () {
  const operations = {
    GET: [GET],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    try {
      const settings = await getSiteSettings();
      return res.status(200).json({
        result: serializeInstanceSettings(settings, getAvailableLanguages()),
      });
    } catch (e) {
      next(e);
    }
  }

  GET.apiDoc = {
    summary: "Returns the public settings of this instance",
    description:
      "Name, colours, hero flag, artist signup policy, trust level names, offered UI languages, how far the first setup went, the Stripe publishable key, the public contact email, the support email (the contact email when unset), the header logo and the compact one for small screens with their intrinsic sizes, and whether they are tinted with the button color, and the custom splash screen (whether it replaces the default one, its background image sizes, its two texts and where the text box sits). Never includes secrets.",
    responses: {
      200: {
        description: "The public instance settings",
        schema: {
          type: "object",
          properties: {
            result: {
              type: "object",
              properties: {
                name: { type: "string" },
                colors: {
                  type: "object",
                  properties: {
                    button: { type: "string" },
                    buttonText: { type: "string" },
                    background: { type: "string" },
                    text: { type: "string" },
                  },
                },
                showHeroOnHome: { type: "boolean" },
                isClosedToPublicArtistSignup: { type: "boolean" },
                trustLevelNames: {
                  type: "array",
                  items: { type: "string" },
                },
                languages: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      short: { type: "string" },
                      name: { type: "string" },
                    },
                  },
                },
                setupStage: {
                  type: "string",
                  enum: ["welcome", "guide", "done"],
                },
                stripePublishableKey: { type: "string" },
                contactEmail: { type: "string" },
                supportEmail: { type: "string" },
                logo: {
                  type: "object",
                  properties: {
                    url: { type: "string" },
                    width: { type: "number" },
                    height: { type: "number" },
                  },
                },
                mobileLogo: {
                  type: "object",
                  properties: {
                    url: { type: "string" },
                    width: { type: "number" },
                    height: { type: "number" },
                  },
                },
                tintLogo: { type: "boolean" },
                showCustomSplash: { type: "boolean" },
                splashImage: {
                  type: "object",
                  properties: {
                    sizes: {
                      type: "object",
                      additionalProperties: { type: "string" },
                    },
                  },
                },
                splashTitle: { type: "string" },
                splashSubtitle: { type: "string" },
                splashTextPosition: {
                  type: "string",
                  enum: [...SPLASH_TEXT_POSITIONS],
                },
              },
            },
          },
        },
      },
    },
  };

  return operations;
}
