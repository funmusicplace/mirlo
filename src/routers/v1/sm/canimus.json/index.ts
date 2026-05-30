import { join } from "path";

import prisma from "@mirlo/prisma";
import { Prisma } from "@mirlo/prisma/client";
import { NextFunction, Request, Response } from "express";

import {
  serializeSingleArtistIntoCanimus,
  serializeSingleDeletedArtistIntoCanimus,
} from "../../../../utils/serialize/artist";
import { serializeSingleDeletedTrackIntoCanimus } from "../../../../utils/serialize/track";
import { serializeSingleDeletedTrackGroupIntoCanimus } from "../../../../utils/serialize/trackGroup";
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
      let deleted: Prisma.ArtistWhereInput = {
        deletedAt: { not: null },
      };
      let federated: Prisma.ArtistWhereInput = {
        federatedStreaming: true,
      };

      let federatedAtSomePoint: Prisma.ArtistWhereInput = {
        federatedStreamingOptInDate: { not: null },
      };

      // Artists who opted out (had opted in before, but now are not federated)
      let artistOptedOut: Prisma.ArtistWhereInput = {
        AND: [federatedAtSomePoint, { NOT: federated }],
      };

      // Artists who opted in at some point but were deleted
      let artistFederatedButDeletedFromMirlo: Prisma.ArtistWhereInput = {
        AND: [federatedAtSomePoint, deleted],
      };

      let artistOptedOutOrDeleted: Prisma.ArtistWhereInput = {
        OR: [artistOptedOut, artistFederatedButDeletedFromMirlo],
      };

      let trackGroupDeleted: Prisma.TrackGroupWhereInput = {
        artist: federatedAtSomePoint,
        deletedAt: { not: null },
      };
      let trackDeleted: Prisma.TrackWhereInput = {
        trackGroup: {
          artist: federatedAtSomePoint,
        },
        deletedAt: { not: null },
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

        federated.OR = [
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

        trackGroupDeleted.deletedAt = fromDateFilter;
        trackDeleted.deletedAt = fromDateFilter;
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

      const deletedTrackGroups = await prisma.trackGroup.findMany({
        where: trackGroupDeleted,
        include: {
          artist: {
            select: {
              urlSlug: true,
            },
          },
        },
        skip: skipQuery ? Number(skipQuery) : undefined,
        take: take ? Number(take) : undefined,
        orderBy: orderByClause as Prisma.TrackGroupOrderByWithRelationInput,
      });

      const deletedTracks = await prisma.track.findMany({
        where: trackDeleted,
        include: {
          trackGroup: {
            include: {
              artist: {
                select: {
                  urlSlug: true,
                },
              },
            },
          },
        },
        skip: skipQuery ? Number(skipQuery) : undefined,
        take: take ? Number(take) : undefined,
        orderBy: orderByClause as Prisma.TrackOrderByWithRelationInput,
      });

      let deletedEntities: any = [];
      deletedEntities = deletedEntities
        .concat(
          deletedArtists.map((artist) =>
            serializeSingleDeletedArtistIntoCanimus(artist)
          )
        )
        .concat(
          deletedTrackGroups.map((trackGroup) =>
            serializeSingleDeletedTrackGroupIntoCanimus(
              trackGroup,
              join(String(process.env.API_DOMAIN), trackGroup.artist.urlSlug)
            )
          )
        )
        .concat(
          deletedTracks.map((track) =>
            serializeSingleDeletedTrackIntoCanimus(
              track,
              join(
                String(process.env.API_DOMAIN),
                track.trackGroup.artist.urlSlug,
                "release",
                track.trackGroup.urlSlug
              )
            )
          )
        );

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
