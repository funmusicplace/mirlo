import prisma from "@mirlo/prisma";
import { NextFunction, Request, Response } from "express";

import { userAuthenticated } from "../../../auth/passport";

type Query = {
  urlSlug?: string;
  artistId?: string;
};

export default function () {
  const operations = {
    GET: [userAuthenticated, GET],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { artistId, urlSlug } = req.query as unknown as Query;
    try {
      let exists = false;

      const trackGroup = await prisma.trackGroup.findFirst({
        where: {
          urlSlug: { equals: urlSlug, mode: "insensitive" },
          profileId: Number(artistId),
        },
      });
      exists = !!trackGroup;
      res.status(200);
      res.json({ result: { exists } });
    } catch (e) {
      next(e);
    }
  }

  return operations;
}
