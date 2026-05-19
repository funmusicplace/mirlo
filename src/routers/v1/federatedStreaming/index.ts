import prisma from "@mirlo/prisma";
import { Prisma } from "@mirlo/prisma/client";
import { NextFunction, Request, Response } from "express";

import { serializeSingleArtistIntoCanimus } from "../../../utils/serialize/artist";
import { whereForPublishedTrackGroups } from "../../../utils/trackGroup";

export default function () {
  const operations = {
    GET,
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { skip: skipQuery, take, fromDate } = req.query;

    try {
      let fromDateFilter;
      if (fromDate) {
        fromDateFilter = { gte: new Date(fromDate as string) };
      } else {
        fromDateFilter = undefined;
      }

      let where: Prisma.ArtistWhereInput = {
        federatedStreaming: true,
      };

      if (fromDateFilter) {
        const updatedOrCreatedFilter:
          | Prisma.TrackGroupWhereInput
          | Prisma.TrackWhereInput
          | Prisma.ArtistWhereInput = {
          AND: [
            { deletedAt: null },
            {
              OR: [
                {
                  createdAt: fromDateFilter,
                },
                {
                  updatedAt: fromDateFilter,
                },
              ],
            },
          ],
        };

        where.OR = [
          updatedOrCreatedFilter as Prisma.ArtistWhereInput,
          {
            trackGroups: {
              some: {
                OR: [
                  updatedOrCreatedFilter as Prisma.TrackGroupWhereInput,
                  {
                    tracks: {
                      some: updatedOrCreatedFilter as Prisma.TrackWhereInput,
                    },
                  },
                ],
              },
            },
          },
        ];
      }

      const count = await prisma.artist.count({
        where,
      });

      const orderByClause: Prisma.ArtistOrderByWithRelationInput = {
        createdAt: "desc",
      };

      const artists = await prisma.artist.findMany({
        where,
        skip: skipQuery ? Number(skipQuery) : undefined,
        take: take ? Number(take) : undefined,
        orderBy: orderByClause,
        include: {
          trackGroups: {
            where: whereForPublishedTrackGroups(),
            include: {
              cover: true,
              tracks: true,
            },
            orderBy: { orderIndex: "asc" },
          },
          avatar: {
            where: {
              deletedAt: null,
            },
          },
        },
      });
      res.json({
        type: "root",
        url: process.env.API_DOMAIN,
        children: artists.map((artist) =>
          serializeSingleArtistIntoCanimus(artist)
        ),
        total: count,
      });
    } catch (e) {
      next(e);
    }
  }

  GET.apiDoc = {
    summary: "Returns federated artists",
    responses: {
      200: {
        description: "A list of artists",
        schema: {
          type: "array",
          items: {
            $ref: "#/definitions/Artist",
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
