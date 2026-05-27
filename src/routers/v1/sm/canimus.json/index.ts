import prisma from "@mirlo/prisma";
import { Prisma } from "@mirlo/prisma/client";
import { NextFunction, Request, Response } from "express";

import {
  serializeSingleArtistIntoCanimus,
  serializeSingleDeletedArtistIntoCanimus,
} from "../../../../utils/serialize/artist";
import { whereForPublishedTrackGroups } from "../../../../utils/trackGroup";

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

      let artistOptedOut: Prisma.ArtistWhereInput = {
        AND: [
          {
            federatedStreaming: false,
            NOT: {
              federatedStreamingOptInDate: null, // discard artists that never opted in
            },
          },
        ],
      };

      let artistFederatedButDeletedFromMirlo: Prisma.ArtistWhereInput = {
        AND: [
          {
            NOT: {
              federatedStreamingOptInDate: null, // discard artists that never opted in
              deletedAt: null,
            },
          },
        ],
      };

      let artistOptedOutOrDeleted: Prisma.ArtistWhereInput = {
        OR: [artistOptedOut, artistFederatedButDeletedFromMirlo],
      };

      if (fromDateFilter) {
        const optInDateFilter: Prisma.ArtistWhereInput = {
          federatedStreamingOptInDate: fromDateFilter,
        };

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
          optInDateFilter,
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

      const orderByClause:
        | Prisma.ArtistOrderByWithRelationInput
        | Prisma.TrackGroupOrderByWithRelationInput = {
        createdAt: "desc",
      };

      const artists = await prisma.artist.findMany({
        where,
        skip: skipQuery ? Number(skipQuery) : undefined,
        take: take ? Number(take) : undefined,
        orderBy: orderByClause as Prisma.ArtistOrderByWithRelationInput,
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

      const deletedArtists = await prisma.artist.findMany({
        where: artistOptedOutOrDeleted,
        skip: skipQuery ? Number(skipQuery) : undefined,
        take: take ? Number(take) : undefined,
        orderBy: orderByClause as Prisma.ArtistOrderByWithRelationInput,
        include: {
          trackGroups: {
            include: {
              tracks: true,
            },
            orderBy: { orderIndex: "asc" },
          },
        },
      });
      // const deletedReleases = await prisma.trackGroup.findMany({
      //   where: {
      //     artist: artistOptedOutOrDeleted,
      //   },
      //   skip: skipQuery ? Number(skipQuery) : undefined,
      //   take: take ? Number(take) : undefined,
      //   orderBy: orderByClause as Prisma.TrackGroupOrderByWithRelationInput,
      // });

      let deletedEntities: any = [];
      for (const deletedArtist of deletedArtists.map((artist) =>
        serializeSingleDeletedArtistIntoCanimus(artist)
      )) {
        deletedEntities.concat(deletedArtist);
      }

      res.json({
        type: "root",
        url: process.env.API_DOMAIN,
        children: artists.map((artist) =>
          serializeSingleArtistIntoCanimus(artist)
        ),
        deleted: deletedEntities,
      });
    } catch (e) {
      next(e);
    }
  }

  GET.apiDoc = {
    summary: "Returns federated artists",
    parameters: [{ in: "query", name: "fromDate", type: "string" }],
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
