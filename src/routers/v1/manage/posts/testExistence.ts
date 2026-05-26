import prisma from "@mirlo/prisma";
import { NextFunction, Request, Response } from "express";

import { userAuthenticated } from "../../../../auth/passport";

type Query = {
  urlSlug?: string;
  artistId?: string;
  forPostId?: string;
};

export default function () {
  const operations = {
    GET: [userAuthenticated, GET],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { urlSlug, artistId, forPostId } = req.query as unknown as Query;
    try {
      const post = await prisma.post.findFirst({
        where: {
          urlSlug: { equals: urlSlug, mode: "insensitive" },
          artistId: Number(artistId),
          ...(forPostId ? { id: { not: Number(forPostId) } } : {}),
        },
      });
      res.status(200);
      res.json({ result: { exists: !!post } });
    } catch (e) {
      next(e);
    }
  }

  return operations;
}
