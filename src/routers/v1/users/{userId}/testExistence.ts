import { Request, Response } from "express";
import { userAuthenticated } from "../../../../auth/passport";
import prisma from "../../../../../prisma/prisma";

type Query = {
  urlSlug: string;
  artistId?: number;
};

export default function () {
  const operations = {
    GET: [userAuthenticated, GET],
  };

  async function GET(req: Request, res: Response) {
    const { artistId, urlSlug } = req.query as unknown as Query;
    try {
      let exists = false;
      if (!artistId) {
        const artist = await prisma.artist.findFirst({
          where: {
            urlSlug: { equals: urlSlug, mode: "insensitive" },
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
      res.status(200);
      res.json({ result: { exists } });
    } catch {
      res.status(400);
      res.json({
        error: "Invalid route",
      });
    }
  }

  return operations;
}
