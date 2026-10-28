import { Response } from "express";

import { serializeInstanceSettings } from "../serializers/instanceSettings";

import { clearPageCache } from "./pageCache";
import { getSiteSettings } from "./settings";
import { getAvailableLanguages } from "./transifexLanguages";

export const respondWithInstanceSettings = async (res: Response) => {
  clearPageCache();
  return res.status(200).json({
    result: serializeInstanceSettings(
      await getSiteSettings(),
      getAvailableLanguages()
    ),
  });
};
