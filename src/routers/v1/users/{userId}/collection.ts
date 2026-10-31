import prisma from "@mirlo/prisma";
import { Prisma } from "@mirlo/prisma/client";
import { Request, Response } from "express";
import { set } from "lodash";

import { assertLoggedIn } from "../../../../auth/getLoggedInUser";
import { userAuthenticated } from "../../../../auth/passport";
import {
  serializeTrackGroupIntoSubsonic,
  subsonicResponse,
} from "../../../../serializers/subsonic";
import {
  processSingleTrackGroup,
  serializeTrackGroupPurchase,
} from "../../../../serializers/trackGroup";
import {
  subscriptionTierReleasesCount,
  whereForPublishedTrackGroups,
} from "../../../../utils/trackGroup";

type Params = {
  userId: string;
};

export default function () {
  const operations = {
    GET: [userAuthenticated, GET],
  };

  async function GET(req: Request, res: Response) {
    const { userId } = req.params as unknown as Params;
    const { trackGroupId, format } = req.query as unknown as {
      trackGroupId: string;
      format?: string;
    };

    assertLoggedIn(req);
    const loggedInUser = req.user;
    if (Number(userId) === Number(loggedInUser.id)) {
      const where: Prisma.UserTrackGroupPurchaseWhereInput = {
        userId: Number(userId),
      };
      if (trackGroupId) {
        where.trackGroupId = Number(trackGroupId);
      }

      where.trackGroup = whereForPublishedTrackGroups({ includePrivate: true });

      const tgPurchases = await prisma.userTrackGroupPurchase.findMany({
        where,
        include: {
          trackGroup: {
            include: {
              profile: true,
              cover: true,
              _count: subscriptionTierReleasesCount,
              tracks: {
                orderBy: {
                  order: "asc",
                },
              },
            },
          },
          transaction: true,
        },
      });

      const whereTrack: Prisma.UserTrackPurchaseWhereInput = {
        userId: Number(userId),
      };
      if (trackGroupId) {
        whereTrack.track = { trackGroupId: Number(trackGroupId) };
      }

      set(
        whereTrack,
        "track.trackGroup",
        whereForPublishedTrackGroups({ includePrivate: true })
      );

      const trackPurchases = await prisma.userTrackPurchase.findMany({
        where: whereTrack,
        include: {
          track: {
            include: {
              trackGroup: {
                include: {
                  profile: true,
                  cover: true,
                  _count: subscriptionTierReleasesCount,
                  tracks: {
                    orderBy: {
                      order: "asc",
                    },
                  },
                },
              },
            },
          },
          transaction: true,
        },
      });

      const mappedTG = tgPurchases.map((purchase) =>
        serializeTrackGroupPurchase(purchase)
      );

      const mappedTracks = trackPurchases.map((purchase) => {
        const processedTG = processSingleTrackGroup(purchase.track.trackGroup);
        return {
          ...purchase,
          track: { ...purchase.track, trackGroup: processedTG },
        };
      });

      // combine both lists and sort by transaction created date (newest first)
      const combined = [...mappedTG, ...mappedTracks].sort((a, b) => {
        return (a.transaction?.createdAt ?? 0) > (b.transaction?.createdAt ?? 0)
          ? -1
          : 1;
      });

      if (format === "subsonic") {
        res.json(
          subsonicResponse({
            albumList2: {
              album: combined.map((purchase) =>
                "track" in purchase
                  ? serializeTrackGroupIntoSubsonic(purchase.track.trackGroup, [
                      purchase.track,
                    ])
                  : serializeTrackGroupIntoSubsonic(purchase.trackGroup)
              ),
            },
          })
        );
      } else {
        res.json({ results: combined });
      }
    } else {
      res.status(401);
      res.json({
        error: "Invalid route",
      });
    }
  }

  GET.apiDoc = {
    summary: "Returns user's purchased tracks and trackgroups",
    parameters: [
      {
        in: "path",
        name: "userId",
        required: true,
        type: "string",
      },
      {
        in: "query",
        name: "format",
        required: false,
        type: "string",
        description:
          "Set to subsonic to get the collection as a Subsonic albumList2 response",
      },
    ],
    responses: {
      200: {
        description: "Tracks and trackgroups that belong to the user",
        schema: {
          type: "array",
          items: {
            $ref: "#/definitions/TrackGroupPurchase",
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
