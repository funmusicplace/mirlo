import { NextFunction, Request, Response } from "express";
import { userAuthenticated, userHasPermission } from "../../../auth/passport";
import prisma from "../../../../prisma/prisma";
import processor, {
  processTrackGroupQueryOrder,
} from "../../../utils/trackGroup";
import { Prisma } from "@prisma/client";

export default function () {
  const operations = {
    GET: [userAuthenticated, userHasPermission("admin"), GET],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const {
      skip: skipQuery,
      take,
      orderBy,
      isPublished,
      title,
      artistName,
    } = req.query as {
      skip: string;
      take: string;
      orderBy: string;
      isPublished: string;
      title: string;
      artistName: string;
    };

    try {
      let where: Prisma.TrackGroupWhereInput = {
        deletedAt: null,
      };

      if (title && typeof title === "string") {
        where.title = { contains: title, mode: "insensitive" };
      }
      if (artistName && typeof artistName === "string") {
        where.artist = { name: { contains: artistName, mode: "insensitive" } };
      }
      if (isPublished) {
        where.published = true;
      }
      const itemCount = await prisma.trackGroup.count({ where });

      const trackGroups = await prisma.trackGroup.findMany({
        where,
        orderBy: processTrackGroupQueryOrder(orderBy),
        skip: skipQuery ? Number(skipQuery) : undefined,
        take: take ? Number(take) : undefined,
        include: {
          artist: {
            select: {
              name: true,
              urlSlug: true,
              id: true,
            },
          },
          cover: true,
        },
      });
      res.json({
        results: trackGroups.map(processor.single),
        total: itemCount,
      });
    } catch (e) {
      next(e);
    }
  }

  return operations;
}
