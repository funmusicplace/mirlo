import { Prisma } from "@mirlo/prisma/client";
import { NextFunction, Request, Response } from "express";
import prisma from "@mirlo/prisma";

export default function () {
  const operations = {
    GET,
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { tag, orderBy, take, skip } = req.query;

    try {
      let where: Prisma.TagWhereInput = {};

      if (tag && typeof tag === "string") {
        where.tag = { contains: tag, mode: "insensitive" };
      }
      if (orderBy && orderBy === "count") {
        const tags = await prisma.$queryRaw<
          {
            tag: string;
            trackGroupsCount: number;
            id: number;
          }[]
        >`
            select tgt."tagId" as id, t.tag  , count(tgt."trackGroupId") as "trackGroupsCount"
            from "TrackGroupTag" tgt 
            join "Tag" t on t.id = tgt."tagId" 
            join "TrackGroup" tg on tg.id = tgt."trackGroupId" where tg.published = true
            group by  tgt."tagId", t.tag 
            order by  "trackGroupsCount" desc
            limit ${Number(take) ?? 20}
            offset ${Number(skip) ?? 0}
            `;

        return res.json({
          results: tags.map((tag) => ({
            ...tag,
            trackGroupsCount: Number(tag.trackGroupsCount.toString()),
          })),
        });
      }

      const tags = await prisma.tag.findMany({
        where,
        orderBy: { tag: "asc" },
        include: {
          trackGroupTags: {
            include: {
              trackGroup: {},
            },
          },
        },
      });
      return res.json({
        results: tags,
      });
    } catch (e) {
      next(e);
    }
  }

  GET.apiDoc = {
    summary: "Returns all tags",
    responses: {
      200: {
        description: "A list of tags",
        schema: {
          type: "array",
          items: {
            type: "object",
          },
        },
      },
      default: {
        description: "An error occurred",
        schema: {
          additionalProperties: true,
        },
      },
    },
  };

  return operations;
}
