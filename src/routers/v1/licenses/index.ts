import { NextFunction, Request, Response } from "express";
import prisma from "@mirlo/prisma";
import { userAuthenticated } from "../../../auth/passport";

export default function () {
  const operations = {
    GET: [userAuthenticated, GET],
    POST: [userAuthenticated, POST],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    try {
      const itemCount = await prisma.license.count();
      const licenses = await prisma.license.findMany({
        include: {
          _count: {
            select: { track: true },
          },
        },
      });
      return res.json({
        results: licenses,
        total: itemCount,
      });
    } catch (e) {
      next(e);
    }
  }

  GET.apiDoc = {
    summary: "Returns all licenses",
    responses: {
      200: {
        description: "A list of licenses",
      },
      default: {
        description: "An error occurred",
        schema: {
          additionalProperties: true,
        },
      },
    },
  };

  async function POST(req: Request, res: Response, next: NextFunction) {
    const { short, link, name } = req.body;
    try {
      const result = await prisma.license.create({
        data: {
          short,
          link,
          name,
        },
      });
      res.json({ result });
    } catch (e) {
      next(e);
    }
  }

  return operations;
}
