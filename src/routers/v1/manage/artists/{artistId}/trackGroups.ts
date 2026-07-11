import prisma from "@mirlo/prisma";
import { NextFunction, Request, Response } from "express";

import { assertLoggedIn } from "../../../../../auth/getLoggedInUser";
import {
  profileBelongsToLoggedInUser,
  canUserCreateProfiles,
  userAuthenticated,
} from "../../../../../auth/passport";
import {
  getPlatformFeeForProfile,
  whereForAllProfilesThisLabelCanAddReleasesFor,
} from "../../../../../utils/artist";
import processor from "../../../../../utils/trackGroup";

export default function () {
  const operations = {
    GET: [userAuthenticated, profileBelongsToLoggedInUser, GET],
    POST: [
      userAuthenticated,
      profileBelongsToLoggedInUser,
      canUserCreateProfiles,
      POST,
    ],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { artistId: profileId } = req.params;
    const { includeLabelReleases } = req.query;
    assertLoggedIn(req);
    const loggedInUser = req.user;

    try {
      const results = await prisma.trackGroup.findMany({
        where: {
          isHiddenTrackGroupForSongDrafts: false,
          deletedAt: null,
          ...(includeLabelReleases === "true"
            ? {
                OR: [
                  {
                    profile: whereForAllProfilesThisLabelCanAddReleasesFor(
                      loggedInUser.id
                    ),
                  },
                  { paymentToUserId: loggedInUser.id },
                ],
              }
            : { profileId: Number(profileId) }),
        },
        orderBy: {
          releaseDate: "desc",
        },
        include: {
          tracks: {
            where: {
              deletedAt: null,
            },
            include: {
              audio: true,
            },
          },
          profile: { include: { user: { select: { currency: true } } } },
          cover: {
            where: {
              deletedAt: null,
            },
          },
        },
      });

      res.json({
        results: results.map((tg) =>
          processor.single(tg, {
            loggedInUserId: req.user?.id,
          })
        ),
      });
    } catch (e) {
      next(e);
    }
  }

  GET.apiDoc = {
    summary: "Get all trackgroups belonging to a user",
    parameters: [
      {
        in: "query",
        name: "artistId",
        type: "number",
      },
    ],
    responses: {
      200: {
        description: "Created trackgroup",
        schema: {
          type: "array",
          items: {
            $ref: "#/definitions/TrackGroup",
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

  async function POST(req: Request, res: Response, next: NextFunction) {
    const {
      title,
      about,
      releaseDate,
      publishedAt,
      credits,
      type,
      minPrice,
      suggestedPrice,
      urlSlug,
    } = req.body;
    const profileId = Number(req.params.artistId);
    assertLoggedIn(req);
    const user = req.user;

    if (!urlSlug) {
      return res.status(400).json({
        error: "Argument `urlSlug` is missing.",
      });
    }

    try {
      const existingSlug = await prisma.trackGroup.findFirst({
        where: {
          profileId: Number(profileId),
          urlSlug,
        },
      });

      if (existingSlug) {
        return res.status(400).json({
          error: "Can't create a trackGroup with an existing urlSlug",
        });
      }

      const profile = await prisma.profile.findFirst({
        where: {
          id: Number(profileId),
        },
        include: {
          artistLabels: true,
        },
      });

      if (!profile) {
        return res.status(404).json({
          error: "Artist not found",
        });
      }

      let paymentToUserId: number | undefined = undefined;

      if (
        profile?.artistLabels?.some(
          (label) => label.labelUserId === user.id && label.canLabelAddReleases
        )
      ) {
        paymentToUserId = user.id;
      }

      const result = await prisma.trackGroup.create({
        data: {
          title,
          about,
          credits,
          type,
          profile: { connect: { id: profileId } },
          publishedAt: publishedAt ? new Date(publishedAt) : undefined,
          minPrice,
          suggestedPrice,
          paymentToUser: paymentToUserId
            ? { connect: { id: paymentToUserId } }
            : undefined,
          platformPercent: await getPlatformFeeForProfile(profile.id),
          releaseDate: releaseDate ? new Date(releaseDate) : undefined,
          adminEnabled: true,
          urlSlug,
        },
      });
      return res.json({ result });
    } catch (e) {
      next(e);
    }
  }

  POST.apiDoc = {
    summary: "Creates a trackGroup belonging to a user",
    parameters: [
      {
        in: "path",
        name: "artistId",
        required: true,
        type: "number",
      },
      {
        in: "body",
        name: "trackGroup",
        schema: {
          $ref: "#/definitions/TrackGroup",
        },
      },
    ],
    responses: {
      200: {
        description: "Created trackgroup",
        schema: {
          $ref: "#/definitions/TrackGroup",
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
