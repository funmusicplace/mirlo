import { NextFunction, Request, Response } from "express";
import { userAuthenticated } from "../../../../auth/passport";
import prisma from "@mirlo/prisma";

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
    const { email } = req.query as unknown as Query;
    try {
      let exists = false;
      const user = await prisma.user.findFirst({
        where: { email },
      });
      exists = !!user;

      res.status(200);
      res.json({ result: { exists } });
    } catch (e) {
      next(e);
    }
  }

  return operations;
}
