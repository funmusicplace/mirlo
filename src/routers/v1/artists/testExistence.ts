import { NextFunction, Request, Response } from "express";
import { userAuthenticated } from "../../../auth/passport";
import prisma from "@mirlo/prisma";
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
      let exists = false;
      if (urlSlug) {
        const profile = await prisma.profile.findFirst({
          where: {
            AND: {
              urlSlug: { equals: urlSlug, mode: "insensitive" },
              ...(forProfileId ? { id: { not: Number(forProfileId) } } : {}),
            },
          },
        });
        exists = !!profile;
      } else {
        throw new AppError({
          httpCode: 400,
          description: "Need to provide a urlSlug",
        });
      }
      res.status(200);
      res.json({ result: { exists } });
    } catch (e) {
      next(e);
    }
  }

  return operations;
}
