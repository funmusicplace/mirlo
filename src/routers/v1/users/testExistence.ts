import prisma from "@mirlo/prisma";
import { NextFunction, Request, Response } from "express";

import { assertLoggedIn } from "../../../auth/getLoggedInUser";
import { userAuthenticated } from "../../../auth/passport";

type Query = {
  urlSlug?: string;
};

export default function () {
  const operations = {
    GET: [userAuthenticated, GET],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { urlSlug } = req.query as unknown as Query;
    assertLoggedIn(req);
    const loggedInUser = req.user;
    try {
      let exists = false;

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
