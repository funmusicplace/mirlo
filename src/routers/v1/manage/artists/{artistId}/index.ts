import prisma from "@mirlo/prisma";
import { NextFunction, Request, Response } from "express";
import { merge } from "lodash";

import { assertLoggedIn } from "../../../../../auth/getLoggedInUser";
import {
  profileBelongsToLoggedInUser,
  userAuthenticated,
} from "../../../../../auth/passport";
import {
  deleteProfile,
  findProfileIdForURLSlug,
  singleInclude,
} from "../../../../../utils/artist";
import { AppError } from "../../../../../utils/error";
import generateSlug from "../../../../../utils/generateSlug";
import { processSingleProfile } from "../../../../../utils/serialize/artist";

type Params = {
  artistId: string;
};

export default function () {
  const operations = {
    PUT: [userAuthenticated, profileBelongsToLoggedInUser, PUT],
    GET: [userAuthenticated, profileBelongsToLoggedInUser, GET],
    DELETE: [userAuthenticated, profileBelongsToLoggedInUser, DELETE],
  };

  async function PUT(req: Request, res: Response, next: NextFunction) {
    const { artistId: profileId } = req.params as unknown as Params;
    const {
      bio,
      name,
      urlSlug,
      properties,
      links,
      linksJson,
      location,
      activityPub,
      federatedStreaming,
      purchaseEntireCatalogMinPrice,
      defaultPlatformFee,
      tourDates,
      shortDescription,
      maxFreePlays,
      announcementText,
      allowDirectMessages,
      displayLabelUserId,
    } = req.body;
    assertLoggedIn(req);
    const user = req.user;

    try {
      const existingProfile = await prisma.profile.findFirst({
        where: {
          id: Number(profileId),
        },
      });
      // FIXME: check type of properties object.
      const oldProperties = existingProfile?.properties || {};

      let federatedStreamingOptInDate =
        existingProfile?.federatedStreamingOptInDate;
      let federatedStreamingOptOutDate =
        existingProfile?.federatedStreamingOptInDate;

      if (existingProfile?.federatedStreaming != federatedStreaming) {
        if (federatedStreaming) {
          federatedStreamingOptInDate = new Date(Date.now());
        } else {
          federatedStreamingOptOutDate = new Date(Date.now());
        }
      }

      const updatedCount = await prisma.$transaction(async (tx) => {
        if (displayLabelUserId !== undefined) {
          await tx.artistLabel.updateMany({
            where: {
              artistId: Number(profileId),
              isDisplayedOnArtistPage: true,
            },
            data: { isDisplayedOnArtistPage: false },
          });
          if (displayLabelUserId !== null) {
            const approvedLabel = await tx.artistLabel.findFirst({
              where: {
                artistId: Number(profileId),
                labelUserId: Number(displayLabelUserId),
                isArtistApproved: true,
                isLabelApproved: true,
              },
            });
            if (!approvedLabel) {
              throw new AppError({
                httpCode: 400,
                description:
                  "This label is not approved on both sides yet, so it can't be displayed on the artist page.",
              });
            }
            await tx.artistLabel.update({
              where: {
                labelUserId_artistId: {
                  artistId: Number(profileId),
                  labelUserId: Number(displayLabelUserId),
                },
              },
              data: { isDisplayedOnArtistPage: true },
            });
          }
        }

        const result = await tx.profile.updateMany({
          where: {
            id: Number(profileId),
          },
          data: {
            bio,
            name,
            links,
            linksJson,
            location,
            activityPub,
            federatedStreaming,
            federatedStreamingOptInDate,
            federatedStreamingOptOutDate,
            purchaseEntireCatalogMinPrice,
            defaultPlatformFee,
            shortDescription,
            maxFreePlays,
            announcementText,
            allowDirectMessages,
            ...(urlSlug
              ? {
                  urlSlug: generateSlug(urlSlug),
                }
              : {}),
            properties: merge(oldProperties, properties),
          },
        });

        if (tourDates) {
          await tx.artistTourDate.deleteMany({
            where: {
              artistId: Number(profileId),
            },
          });
          await tx.artistTourDate.createMany({
            data: tourDates.map((tourDate: any) => ({
              artistId: Number(profileId),
              location: tourDate.location,
              date: new Date(tourDate.date),
              ticketsUrl: tourDate.ticketsUrl,
            })),
          });
        }

        return result.count;
      });

      if (updatedCount) {
        const profile = await prisma.profile.findFirst({
          where: { id: Number(profileId) },
        });
        res.json({
          result: profile 
            ? processSingleProfile(profile, Number(user.id))
            : profile,
        });
      } else {
        res.json({
          error: "An unknown error occurred",
        });
      }
    } catch (error) {
      next(error);
    }
  }

  PUT.apiDoc = {
    summary: "Updates an artist belonging to a user",
    parameters: [
      {
        in: "path",
        name: "artistId",
        required: true,
        type: "string",
      },
      {
        in: "body",
        name: "artist",
        schema: {
          $ref: "#/definitions/Profile",
        },
      },
    ],
    responses: {
      200: {
        description: "Updated artist",
        schema: {
          $ref: "#/definitions/Profile",
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

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { artistId: profileId } = req.params as unknown as Params;
    assertLoggedIn(req);
    const user = req.user;

    const castProfileId = await findProfileIdForURLSlug(profileId);
    try {
      const profile = await prisma.profile.findFirst({
        where: {
          id: Number(castProfileId),
        },
        include: {
          ...singleInclude({ includePrivate: true }),
          merch: {
            where: {
              deletedAt: null,
            },
            include: { images: true, includePurchaseTrackGroup: true },
          },
        } as any,
      });

      if (!profile) {
        return res.status(404).json({
          error: "Artist not found",
        });
      } else {
        return res.json({
          result: processSingleProfile(profile, Number(user.id)),
        });
      }
    } catch (e) {
      next(e);
    }
  }

  GET.apiDoc = {
    summary: "Returns artist information that belongs to a user",
    parameters: [
      {
        in: "path",
        name: "artistId",
        required: true,
        type: "string",
      },
    ],
    responses: {
      200: {
        description: "An artist that matches the id",
        schema: {
          $ref: "#/definitions/Profile",
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
    const { artistId: profileId } = req.params as unknown as Params;
    assertLoggedIn(req);
    const user = req.user;

    try {
      await deleteProfile(Number(user.id), Number(profileId));
    } catch (e) {
      return next(e);
    }
    res.json({ message: "Success" });
  }

  DELETE.apiDoc = {
    summary: "Deletes an Artist belonging to a user",
    parameters: [
      {
        in: "path",
        name: "artistId",
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
