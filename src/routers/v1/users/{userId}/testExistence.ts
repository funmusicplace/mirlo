import { Request, Response } from "express";
import { userAuthenticated } from "../../../../auth/passport";
import prisma from "../../../../../prisma/prisma";

type Query = {
  urlSlug: string;
};

export default function () {
  const operations = {
    GET: [userAuthenticated, GET],
  };

  async function GET(req: Request, res: Response) {
    const { urlSlug } = req.query as unknown as Query;
    try {
      const artist = await prisma.artist.findFirst({
        where: {
          urlSlug,
        },
      });
      if (artist) {
        res.status(200);
        res.json({ result: { exists: true } });
      } else {
        res.status(200);
        res.json({ result: { exists: false } });
      }
    } catch {
      res.status(400);
      res.json({
        error: "Invalid route",
      });
    }
  }

  return operations;
}
