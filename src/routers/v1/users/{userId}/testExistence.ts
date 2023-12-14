import { NextFunction, Request, Response } from "express";
import { userAuthenticated } from "../../../../auth/passport";
import prisma from "../../../../../prisma/prisma";

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
    const { artistId, urlSlug, email, forArtistId } =
      req.query as unknown as Query;
    try {
      let exists = false;
      if (email) {
        const user = await prisma.user.findFirst({
          where: { email },
        });
        exists = !!user;
      } else if (urlSlug) {
        if (!artistId) {
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
          const trackGroup = await prisma.trackGroup.findFirst({
            where: {
              urlSlug: { equals: urlSlug, mode: "insensitive" },
              artistId: Number(artistId),
            },
          });
          exists = !!trackGroup;
        }
      }
      res.status(200);
      res.json({ result: { exists } });
    } catch (e) {
      next(e);
    }
  }

  return operations;
}
