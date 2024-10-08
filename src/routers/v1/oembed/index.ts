import { NextFunction, Request, Response } from "express";
import prisma from "@mirlo/prisma";
import logger from "../../../logger";
import { AppError } from "../../../utils/error";

export default function () {
  const operations = {
    GET: [GET],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { url, maxwidth, format, minwidth } = req.query as {
      url: string;
      format: string;
      maxwidth: string;
      minwidth: string;
    };

    try {
      if (format !== "json") {
        throw new AppError({
          httpCode: 400,
          description: "We only support json oEmbed requests for now",
        });
      }
      const client = prisma.client.findFirst({
        where: {
          applicationName: "frontend",
        },
      });
      console.log("url", url);

      if (url.includes("release")) {
        const matches = url.matchAll(/(.*)\/(.*)\/release\/(.*)/gm);
        console.log("matches", matches);
        for (const match of matches) {
          console.log("match", match);
        }
      } else {
      }
      return next();
    } catch (e) {
      logger.error("Something went wrong");
      next(e);
    }
  }
  return operations;
}
