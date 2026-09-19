import prisma from "@mirlo/prisma";
import { User } from "@mirlo/prisma/client";
import { NextFunction, Request, Response } from "express";
import { pick } from "lodash";

import { assertLoggedIn } from "../../../../../auth/getLoggedInUser";
import {
  trackGroupBelongsToLoggedInUser,
  userAuthenticated,
} from "../../../../../auth/passport";
import { processSingleTrackGroup } from "../../../../../serializers/trackGroup";
import { AppError } from "../../../../../utils/error";
import generateSlug from "../../../../../utils/generateSlug";
import {
  deleteTrackGroup,
  finalizeTrackGroupPublication,
  trackGroupSingleInclude,
} from "../../../../../utils/trackGroup";

type Params = {
  trackGroupId: string;
  userId: string;
};

const resolveTargetProfileId = async (
  requestedProfileId: unknown,
  currentProfileId: number,
  user: User
): Promise<number> => {
  if (requestedProfileId === undefined || requestedProfileId === null) {
    return currentProfileId;
  }

  const profileId = Number(requestedProfileId);

  if (!Number.isInteger(profileId)) {
    throw new AppError({
      httpCode: 400,
      description: "moveToArtistId has to be the id of one of your artists",
    });
  }

  if (profileId === currentProfileId) {
    return currentProfileId;
  }

  const destination = await prisma.profile.findFirst({
    where: {
      id: profileId,
      deletedAt: null,
      ...(user.isAdmin ? {} : { userId: user.id }),
    },
    select: { id: true },
  });

  if (!destination) {
    throw new AppError({
      httpCode: 400,
      description:
        "You can only move a release to another artist on your own account",
    });
  }

  return destination.id;
};

const findNewSlug = async (
  slug: string,
  counter: number,
  profileId: number
): Promise<string> => {
  const verifySlug = await prisma.trackGroup.findFirst({
    where: {
      urlSlug: `${slug}`,
      profileId: profileId,
    },
  });
  if (verifySlug) {
    return await findNewSlug(`${slug}-${counter + 1}`, counter + 1, profileId);
  } else {
    return slug;
  }
};

export default function () {
  const operations = {
    PUT: [userAuthenticated, trackGroupBelongsToLoggedInUser, PUT],
    DELETE: [userAuthenticated, trackGroupBelongsToLoggedInUser, DELETE],
    GET: [userAuthenticated, trackGroupBelongsToLoggedInUser, GET],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { trackGroupId } = req.params as unknown as Params;
    assertLoggedIn(req);
    const loggedInUser = req.user;

    try {
      const trackGroup = await prisma.trackGroup.findFirst({
        where: {
          id: Number(trackGroupId),
        },
        include: {
          ...trackGroupSingleInclude({
            loggedInUserId: Number(loggedInUser.id),
            ownerId: Number(loggedInUser.id),
          }),
          merch: {
            include: {
              images: true,
            },
          },
          fundraiser: true,
          downloadableContent: {
            include: {
              downloadableContent: true,
            },
          },
        },
      });

      if (!trackGroup) {
        throw new AppError({
          httpCode: 404,
          description: "TrackGroup not found",
        });
      }

      return res.status(200).json({
        result: processSingleTrackGroup(trackGroup, {
          loggedInUserId: loggedInUser.id,
        }),
      });
    } catch (e) {
      next(e);
    }
  }

  async function PUT(req: Request, res: Response, next: NextFunction) {
    const { trackGroupId } = req.params as unknown as Params;
    const data = req.body;

    try {
      if (data.isPublic !== undefined && typeof data.isPublic !== "boolean") {
        throw new AppError({
          httpCode: 400,
          description: "isPublic must be a boolean",
        });
      }

      for (const key of [
        "minPrice",
        "suggestedPrice",
        "defaultTrackMinPrice",
      ] as const) {
        const raw = data[key];
        if (raw === undefined || raw === null) continue;
        const value = Number(raw);
        if (!Number.isFinite(value) || value < 0) {
          throw new AppError({
            httpCode: 400,
            description: `${key} must be zero or greater`,
          });
        }
      }

      const newValues = pick(data, [
        "title",
        "releaseDate",
        "type",
        "about",
        "minPrice",
        "suggestedPrice",
        "credits",
        "platformPercent",
        "isGettable",
        "paymentToUserId",
        "fundraisingEndDate",
        "fundraisingGoal",
        "isAllOrNothing",
        "publishedAt",
        "defaultAllowMirloPromo",
        "defaultTrackAllowIndividualSale",
        "defaultTrackMinPrice",
        "defaultIsPreview",
        "catalogNumber",
        "coverImageAlt",
        "urlSlug",
        "isPreorder",
        "scheduleEndOnReleaseDate",
        "makeTracksPreviewableOnRelease",
        "isPublic",
      ]);

      const existingTrackGroup = await prisma.trackGroup.findFirst({
        where: { id: Number(trackGroupId) },
      });

      if (!existingTrackGroup) {
        throw new AppError({
          httpCode: 404,
          description: "TrackGroup not found",
        });
      }

      assertLoggedIn(req);
      const targetProfileId = await resolveTargetProfileId(
        data.moveToArtistId,
        existingTrackGroup.profileId,
        req.user
      );

      const movingToNewProfile =
        targetProfileId !== existingTrackGroup.profileId;

      if (newValues.urlSlug) {
        newValues.urlSlug =
          generateSlug(newValues.urlSlug) || newValues.urlSlug;
      }

      const slugToCheck = newValues.urlSlug ?? existingTrackGroup.urlSlug;

      if (
        slugToCheck &&
        (movingToNewProfile || slugToCheck !== existingTrackGroup.urlSlug)
      ) {
        newValues.urlSlug = slugToCheck;
        const slugConflict = await prisma.trackGroup.findFirst({
          where: {
            profileId: targetProfileId,
            urlSlug: slugToCheck,
            id: { not: Number(trackGroupId) },
            deletedAt: null,
          },
        });
        if (slugConflict) {
          if (!movingToNewProfile) {
            throw new AppError({
              httpCode: 400,
              description: "Can't re-use URL for existing album",
            });
          }
          newValues.urlSlug = await findNewSlug(
            slugToCheck,
            0,
            targetProfileId
          );
        }
      }

      await prisma.trackGroup.updateMany({
        where: { id: Number(trackGroupId) },
        data: {
          ...newValues,
          ...(movingToNewProfile ? { profileId: targetProfileId } : {}),
        },
      });

      let trackGroup = await prisma.trackGroup.findFirst({
        where: { id: Number(trackGroupId) },
      });

      const isPublishedNow =
        trackGroup?.publishedAt && trackGroup.publishedAt <= new Date();
      const flippedToPublic =
        existingTrackGroup.isPublic === false &&
        trackGroup?.isPublic === true &&
        isPublishedNow;
      if (flippedToPublic && trackGroup?.publishedAt) {
        trackGroup = await finalizeTrackGroupPublication(
          trackGroup,
          trackGroup.publishedAt
        );
      }

      if (trackGroup?.title && trackGroup.urlSlug.includes("mi-temp-slug")) {
        let slug = generateSlug(newValues.title);
        if (slug === "") {
          slug = "blank";
        }
        const newSlug = await findNewSlug(slug, 0, trackGroup.profileId);
        await prisma.trackGroup.update({
          where: { id: trackGroup.id },
          data: {
            urlSlug: newSlug,
          },
        });
        trackGroup = await prisma.trackGroup.findFirst({
          where: { id: Number(trackGroupId) },
        });
      }

      res.json({
        result: trackGroup
          ? processSingleTrackGroup(trackGroup, {
              loggedInUserId: req.user?.id,
            })
          : trackGroup,
      });
    } catch (error) {
      next(error);
    }
  }

  PUT.apiDoc = {
    summary: "Updates a trackGroup belonging to a user",
    parameters: [
      {
        in: "path",
        name: "trackGroupId",
        required: true,
        type: "string",
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
        description: "Updated trackgroup",
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

  async function DELETE(req: Request, res: Response, next: NextFunction) {
    const { trackGroupId } = req.params as {
      trackGroupId: string;
    };
    try {
      await deleteTrackGroup(Number(trackGroupId), true);

      return res.json({ message: "Success" });
    } catch (e) {
      next(e);
    }
  }

  DELETE.apiDoc = {
    summary: "Deletes a trackGroup belonging to a user",
    parameters: [
      {
        in: "path",
        name: "trackGroupId",
        required: true,
        type: "string",
      },
    ],
    responses: {
      200: {
        description: "Delete success",
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
