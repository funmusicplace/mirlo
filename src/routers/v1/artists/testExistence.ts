import { NextFunction, Request, Response } from "express";
import { userAuthenticated } from "../../../auth/passport";
import prisma from "../../../../prisma/prisma";
import { AppError } from "../../../utils/error";

type Query = {
  urlSlug?: string;
  artistId?: number;
  email?: string;
  forArtistId?: string;
};

export default function () {
  const operations = {
    GET: [userAuthenticated, GET],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { urlSlug, forArtistId } = req.query as unknown as Query;
    try {
      let exists = false;
      if (urlSlug) {
        const artist = await prisma.artist.findFirst({
          where: {
            AND: {
              urlSlug: { equals: urlSlug, mode: "insensitive" },
              ...(forArtistId ? { id: { not: Number(forArtistId) } } : {}),
            },
          },
        });
        exists = !!artist;
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
