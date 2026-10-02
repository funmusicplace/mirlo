import { NextFunction, Request, Response } from "express";

import { serializeInstanceSettings } from "../../serializers/instanceSettings";
import { getSiteSettings } from "../../utils/settings";
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
      "Name, colours, hero flag, artist signup policy, trust level names and offered UI languages. Never includes secrets.",
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
              },
            },
          },
        },
      },
    },
  };

  return operations;
}
