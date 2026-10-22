import { NextFunction, Request, Response } from "express";

import { userAuthenticated } from "../../../auth/passport";
import { isProfileSlugTaken } from "../../../utils/artist";
import { AppError } from "../../../utils/error";

type Query = {
  urlSlug?: string;
  forArtistId?: string;
};

export default function () {
  const operations = {
    GET: [userAuthenticated, GET],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { urlSlug, forArtistId: forProfileId } =
      req.query as unknown as Query;
    try {
      if (!urlSlug) {
        throw new AppError({
          httpCode: 400,
          description: "Need to provide a urlSlug",
        });
      }
      const exists = await isProfileSlugTaken(
        urlSlug,
        forProfileId ? Number(forProfileId) : undefined
      );
      res.status(200);
      res.json({ result: { exists } });
    } catch (e) {
      next(e);
    }
  }

  return operations;
}
