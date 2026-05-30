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

      let federated: Prisma.ArtistWhereInput = {
        federatedStreaming: true,
      };

      // Artists who opted out (had opted in before, but now streaming is false)
      let artistOptedOut: Prisma.ArtistWhereInput = {
        federatedStreaming: false,
        federatedStreamingOptInDate: { not: null }, // opted in at some point
      };

      // Artists who opted in but were later deleted
      let artistFederatedButDeletedFromMirlo: Prisma.ArtistWhereInput = {
        federatedStreamingOptInDate: { not: null }, // they opted in at some point
        deletedAt: { not: null }, // they are deleted
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
          deletedAt: null,
          OR: [
            {
              createdAt: fromDateFilter,
            },
            {
              updatedAt: fromDateFilter,
            },
          ],
        };

        federated.AND = [
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
        artistOptedOutOrDeleted.AND = [
          {
            federatedStreamingOptOutDate: fromDateFilter,
          },
        ];
      }

      const orderByClause:
        | Prisma.ArtistOrderByWithRelationInput
        | Prisma.TrackGroupOrderByWithRelationInput = {
        createdAt: "desc",
      };

      const artists = await prisma.artist.findMany({
        where: federated,
        skip: skipQuery ? Number(skipQuery) : undefined,
        take: take ? Number(take) : undefined,
        orderBy: orderByClause as Prisma.ArtistOrderByWithRelationInput,
        include: {
          trackGroups: {
            where: whereForPublishedTrackGroups(),
            include: {
              cover: true,
              tracks: {
                where: {
                  deletedAt: null,
                  audio: {
                    uploadState: "SUCCESS",
                  },
                },
                include: {
                  audio: { select: { duration: true } },
                },
                orderBy: { order: "asc" },
              },
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
      });

      // const deletedTrackGroups = await prisma.trackGroup.findMany({
      //   where: {
      //     OR: [
      //       {
      //         artist: artistOptedOutOrDeleted,
      //       },
      //       {
      //         deletedAt:
      //       }
      //     ],
      //   },
      //   include: {
      //     artist: {
      //       select: {
      //         urlSlug: true,
      //       },
      //     },
      //   },
      //   skip: skipQuery ? Number(skipQuery) : undefined,
      //   take: take ? Number(take) : undefined,
      //   orderBy: orderByClause as Prisma.TrackGroupOrderByWithRelationInput,
      // });

      let deletedEntities: any = [];
      deletedEntities = deletedEntities.concat(
        deletedArtists.map((artist) =>
          serializeSingleDeletedArtistIntoCanimus(artist)
        )
      );
      // .concat(
      //   deletedTrackGroups.map((trackGroup) =>
      //     serializeSingleDeletedTrackGroupIntoCanimus(
      //       trackGroup,
      //       trackGroup.artist.urlSlug
      //     )
      //   )
      // );

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
