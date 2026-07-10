import prisma from "@mirlo/prisma";
import { Prisma } from "@mirlo/prisma/client";
import { NextFunction, Request, Response } from "express";
import { set } from "lodash";

import { userAuthenticated, userHasPermission } from "../../../auth/passport";
import { processSingleTrack } from "../../../serializers/track";

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
      allowMirloPromo,
    } = req.query as {
      skip: string;
      take: string;
      orderBy: string;
      isPublished: string;
      title: string;
      artistName: string;
      allowMirloPromo?: string;
    };

    try {
      let where: Prisma.TrackWhereInput = {
        deletedAt: null,
      };

      if (title && typeof title === "string") {
        where.title = { contains: title, mode: "insensitive" };
      }
      if (artistName && typeof artistName === "string") {
        set(where, "trackGroup.profile.name", {
          contains: artistName,
          mode: "insensitive",
        });
      }
      if (isPublished) {
        set(where, "trackGroup.published", true);
      }
      if (allowMirloPromo) {
        set(where, "allowMirloPromo", true);
      }

      const itemCount = await prisma.track.count({ where });

      const tracks = await prisma.track.findMany({
        where,
        skip: skipQuery ? Number(skipQuery) : undefined,
        take: take ? Number(take) : undefined,
        include: {
          trackGroup: {
            include: {
              profile: {
                select: {
                  name: true,
                  urlSlug: true,
                  id: true,
                },
              },
              cover: true,
            },
          },
        },
      });
      res.json({
        results: tracks.map((tr) => processSingleTrack(tr)),
        total: itemCount,
      });
    } catch (e) {
      next(e);
    }
  }

  return operations;
}
