import { join } from "path";

import prisma from "@mirlo/prisma";
import { Prisma } from "@mirlo/prisma/client";
import { NextFunction, Request, Response } from "express";

import {
  serializeSingleArtistIntoCanimus,
  serializeSingleDeletedArtistIntoCanimus,
} from "../../../../serializers/artist";
import { serializeSingleDeletedTrackIntoCanimus } from "../../../../serializers/track";
import { serializeSingleDeletedTrackGroupIntoCanimus } from "../../../../serializers/trackGroup";
import {
  federatedArtistAtSomePoint,
  federatedArtist,
  artistOptedOutOrDeleted,
  whereForVisibleProfile,
} from "../../../../utils/artist";
import { getInstanceName } from "../../../../utils/settings";
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

      const fullCatalog = !!req.client?.fullCatalog;
      const listedAtSomePoint = fullCatalog ? {} : federatedArtistAtSomePoint;

      const listedArtist: Prisma.ProfileWhereInput = fullCatalog
        ? whereForVisibleProfile()
        : { ...federatedArtist };

      const removedArtist: Prisma.ProfileWhereInput = fullCatalog
        ? { deletedAt: { not: null } }
        : { ...artistOptedOutOrDeleted };

      let deleted = {
        deletedAt: { not: null },
      };

      let trackGroupDeleted: Prisma.TrackGroupWhereInput = {
        AND: [
          { profile: listedAtSomePoint },
          deleted as Prisma.TrackGroupWhereInput,
        ],
        deletedAt: {},
      };

      let trackDeleted: Prisma.TrackWhereInput = {
        AND: [
          { trackGroup: { profile: listedAtSomePoint } },
          deleted as Prisma.TrackWhereInput,
        ],
        deletedAt: {},
      };

      if (fromDateFilter) {
        const optInDateFilter: Prisma.ProfileWhereInput = {
          federatedStreamingOptInDate: fromDateFilter,
        };

        const updatedOrCreatedFilter = {
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

        // Artist updated or created or with any
        // TrackGroup updated or created or with any
        // Track updated or created
        let anyTrackUpdatedOrCreated: Prisma.TrackGroupWhereInput = {
          tracks: {
            some: updatedOrCreatedFilter as Prisma.TrackWhereInput,
          },
        };

        let anyTrackGroupUpdatedOrCreated: Prisma.ProfileWhereInput = {
          trackGroups: {
            some: {
              OR: [
                updatedOrCreatedFilter as Prisma.TrackGroupWhereInput,
                anyTrackUpdatedOrCreated,
              ],
            },
          },
        };

        listedArtist.OR = [
          ...(fullCatalog ? [] : [optInDateFilter]),
          updatedOrCreatedFilter as Prisma.ProfileWhereInput,
          anyTrackGroupUpdatedOrCreated,
        ];

        if (fullCatalog) {
          removedArtist.deletedAt = fromDateFilter;
        } else {
          removedArtist.AND = [
            {
              federatedStreamingOptOutDate: fromDateFilter,
            },
          ];
        }

        trackGroupDeleted.deletedAt = fromDateFilter;
        trackDeleted.deletedAt = fromDateFilter;
      }

      const orderByClause = {
        createdAt: "desc",
      };

      const validTracks: Prisma.TrackWhereInput = {
        deletedAt: null,
        audio: {
          uploadState: "SUCCESS",
        },
      };

      const validTrackGroups: Prisma.TrackGroupWhereInput = {
        ...whereForPublishedTrackGroups(),
        // only if they have some track
        tracks: {
          some: validTracks,
        },
      };

      const artists = await prisma.profile.findMany({
        where: {
          ...listedArtist,
          // only if they have some trackGroup
          trackGroups: {
            some: validTrackGroups,
          },
        },
        skip: skipQuery ? Number(skipQuery) : undefined,
        take: take ? Number(take) : undefined,
        orderBy: orderByClause as Prisma.ProfileOrderByWithRelationInput,
        include: {
          trackGroups: {
            where: validTrackGroups,
            include: {
              cover: true,
              tracks: {
                where: validTracks,
                include: {
                  audio: { select: { duration: true } },
                },
                orderBy: { order: "asc" },
              },
            },
            orderBy: { orderIndex: "asc" },
          },
          avatar: true,
          user: { select: { stripeAccountId: true } },
          paymentToUser: { select: { stripeAccountId: true } },
        },
      });

      const deletedArtists = await prisma.profile.findMany({
        where: removedArtist,
        skip: skipQuery ? Number(skipQuery) : undefined,
        take: take ? Number(take) : undefined,
        orderBy: orderByClause as Prisma.ProfileOrderByWithRelationInput,
      });

      const deletedTrackGroups = await prisma.trackGroup.findMany({
        where: trackGroupDeleted,
        include: {
          profile: {
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
              profile: {
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
              join(String(process.env.API_DOMAIN), trackGroup.profile.urlSlug)
            )
          )
        )
        .concat(
          deletedTracks.map((track) =>
            serializeSingleDeletedTrackIntoCanimus(
              track,
              join(
                String(process.env.API_DOMAIN),
                track.trackGroup.profile.urlSlug,
                "release",
                track.trackGroup.urlSlug
              )
            )
          )
        );

      const instanceName = await getInstanceName();

      res.json({
        type: "root",
        url: process.env.API_DOMAIN,
        children: artists.map((artist) =>
          serializeSingleArtistIntoCanimus(artist, instanceName)
        ),
        deleted: deletedEntities,
      });
    } catch (e) {
      next(e);
    }
  }

  GET.apiDoc = {
    summary:
      "Returns artists who turned on Discovery, or every visible artist for a client with fullCatalog",
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
