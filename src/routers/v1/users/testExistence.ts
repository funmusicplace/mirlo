import { NextFunction, Request, Response } from "express";
import { userAuthenticated } from "../../../auth/passport";
import prisma from "@mirlo/prisma";
import { Prisma, User } from "@mirlo/prisma/client";

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
    const { email, urlSlug } = req.query as unknown as Query;
    const loggedInUser = req.user as User;
    try {
      let exists = false;

      if (email) {
        const user = await prisma.user.findFirst({
          where: { email },
        });
        exists = !!user;
      }

      if (urlSlug && loggedInUser) {
        const user = await prisma.user.findFirst({
          where: {
            AND: {
              urlSlug: { equals: urlSlug, mode: "insensitive" },
              id: { not: loggedInUser.id },
            },
          },
        });
        exists = !!user;
      }

      res.status(200);
      res.json({ result: { exists } });
    } catch (e) {
      next(e);
    }
  }

  return operations;
}
