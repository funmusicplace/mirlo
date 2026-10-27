import prisma from "@mirlo/prisma";
import { Prisma } from "@mirlo/prisma/client";
import { NextFunction, Request, Response } from "express";

import {
  canimusArtistUrl,
  serializeSingleArtistIntoCanimus,
  serializeSingleDeletedArtistIntoCanimus,
} from "../../../../serializers/artist";
import { serializeSingleDeletedTrackIntoCanimus } from "../../../../serializers/track";
import {
  canimusReleaseUrl,
  serializeSingleDeletedTrackGroupIntoCanimus,
} from "../../../../serializers/trackGroup";
import { federatedArtistAtSomePoint } from "../../../../utils/artist";
import {
  listedProfileInclude,
  whereForListedProfile,
} from "../../../../utils/canimus";
import { AppError } from "../../../../utils/error";
import { getInstanceName } from "../../../../utils/settings";

const MAX_FULL_CATALOG_TAKE = 100;

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
      const skip = skipQuery ? Number(skipQuery) : undefined;
      const pageSize = take ? Number(take) : undefined;

      if (fullCatalog && pageSize === undefined) {
        throw new AppError({
          httpCode: 400,
          description: "take is required for the full catalogue",
        });
      }
      if (
        (skip !== undefined && !(Number.isInteger(skip) && skip >= 0)) ||
        (pageSize !== undefined &&
          !(
            Number.isInteger(pageSize) &&
            pageSize > 0 &&
            (!fullCatalog || pageSize <= MAX_FULL_CATALOG_TAKE)
          ))
      ) {
        throw new AppError({
          httpCode: 400,
          description: `skip must be 0 or more, and take must be between 1 and ${MAX_FULL_CATALOG_TAKE} for the full catalogue`,
        });
      }
      const listedAtSomePoint = fullCatalog ? {} : federatedArtistAtSomePoint;

      const listedArtist = whereForListedProfile(fullCatalog);

      const removedArtist: Prisma.ProfileWhereInput = {
        ...listedAtSomePoint,
        OR: [
          { deletedAt: fromDateFilter ?? { not: null } },
          { enabled: false, updatedAt: fromDateFilter },
          ...(fullCatalog
            ? []
            : [
                {
                  federatedStreaming: false,
                  federatedStreamingOptOutDate: fromDateFilter,
                },
              ]),
        ],
        deletedAt: {},
      };

      let deleted = {
        deletedAt: { not: null },
      };

      const publishedAtSomePoint = { publishedAt: { lte: new Date() } };

      let trackGroupDeleted: Prisma.TrackGroupWhereInput = {
        AND: [
          { profile: listedAtSomePoint, ...publishedAtSomePoint },
          deleted as Prisma.TrackGroupWhereInput,
        ],
        deletedAt: {},
      };

      let trackDeleted: Prisma.TrackWhereInput = {
        AND: [
          {
            trackGroup: { profile: listedAtSomePoint, ...publishedAtSomePoint },
          },
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

        trackGroupDeleted.deletedAt = fromDateFilter;
        trackDeleted.deletedAt = fromDateFilter;
      }

      const orderByClause = [{ createdAt: "desc" }, { id: "desc" }];

      const include = listedProfileInclude();

      const artists = await prisma.profile.findMany({
        where: {
          ...listedArtist,
          // only if they have some trackGroup
          trackGroups: {
            some: include.trackGroups.where,
          },
        },
        skip,
        take: pageSize,
        orderBy: orderByClause as Prisma.ProfileOrderByWithRelationInput[],
        include,
      });

      const deletedArtists = await prisma.profile.findMany({
        where: removedArtist,
        skip,
        take: pageSize,
        orderBy: orderByClause as Prisma.ProfileOrderByWithRelationInput[],
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
        skip,
        take: pageSize,
        orderBy: orderByClause as Prisma.TrackGroupOrderByWithRelationInput[],
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
        skip,
        take: pageSize,
        orderBy: orderByClause as Prisma.TrackOrderByWithRelationInput[],
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
              canimusArtistUrl(trackGroup.profile)
            )
          )
        )
        .concat(
          deletedTracks.map((track) =>
            serializeSingleDeletedTrackIntoCanimus(
              track,
              canimusReleaseUrl(
                canimusArtistUrl(track.trackGroup.profile),
                track.trackGroup
              )
            )
          )
        );

      const instanceName = await getInstanceName();

      const hasMore =
        pageSize !== undefined &&
        [artists, deletedArtists, deletedTrackGroups, deletedTracks].some(
          (page) => page.length === pageSize
        );
      let links;
      if (hasMore) {
        const next = new URL(req.originalUrl, process.env.API_DOMAIN);
        next.searchParams.set("skip", String((skip ?? 0) + pageSize));
        links = [
          {
            name: "Next page",
            href: next.href,
            type: "application/canimus+json",
            rel: "next",
          },
        ];
      }

      res.json({
        type: "root",
        url: process.env.API_DOMAIN,
        links,
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
    parameters: [
      { in: "query", name: "fromDate", type: "string" },
      { in: "query", name: "skip", type: "string" },
      {
        in: "query",
        name: "take",
        type: "string",
        description: `Required for a client with fullCatalog, at most ${MAX_FULL_CATALOG_TAKE}`,
      },
    ],
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
