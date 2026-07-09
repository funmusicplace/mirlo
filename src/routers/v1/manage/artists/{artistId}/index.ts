import prisma from "@mirlo/prisma";
import { NextFunction, Request, Response } from "express";
import { merge } from "lodash";

import { assertLoggedIn } from "../../../../../auth/getLoggedInUser";
import {
  artistBelongsToLoggedInUser,
  userAuthenticated,
} from "../../../../../auth/passport";
import {
  deleteArtist,
  findArtistIdForURLSlug,
  singleInclude,
} from "../../../../../utils/artist";
import { AppError } from "../../../../../utils/error";
import generateSlug from "../../../../../utils/generateSlug";
import { processSingleArtist } from "../../../../../utils/serialize/artist";

type Params = {
  artistId: string;
};

export default function () {
  const operations = {
    PUT: [userAuthenticated, artistBelongsToLoggedInUser, PUT],
    GET: [userAuthenticated, artistBelongsToLoggedInUser, GET],
    DELETE: [userAuthenticated, artistBelongsToLoggedInUser, DELETE],
  };

  async function PUT(req: Request, res: Response, next: NextFunction) {
    const { artistId } = req.params as unknown as Params;
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
      const existingArtist = await prisma.profile.findFirst({
        where: {
          id: Number(artistId),
        },
      });
      // FIXME: check type of properties object.
      const oldProperties = existingArtist?.properties || {};

      let federatedStreamingOptInDate =
        existingArtist?.federatedStreamingOptInDate;
      let federatedStreamingOptOutDate =
        existingArtist?.federatedStreamingOptInDate;

      if (existingArtist?.federatedStreaming != federatedStreaming) {
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
              artistId: Number(artistId),
              isDisplayedOnArtistPage: true,
            },
            data: { isDisplayedOnArtistPage: false },
          });
          if (displayLabelUserId !== null) {
            const approvedLabel = await tx.artistLabel.findFirst({
              where: {
                artistId: Number(artistId),
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
                  artistId: Number(artistId),
                  labelUserId: Number(displayLabelUserId),
                },
              },
              data: { isDisplayedOnArtistPage: true },
            });
          }
        }

        const result = await tx.profile.updateMany({
          where: {
            id: Number(artistId),
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
              artistId: Number(artistId),
            },
          });
          await tx.artistTourDate.createMany({
            data: tourDates.map((tourDate: any) => ({
              artistId: Number(artistId),
              location: tourDate.location,
              date: new Date(tourDate.date),
              ticketsUrl: tourDate.ticketsUrl,
            })),
          });
        }

        return result.count;
      });

      if (updatedCount) {
        const artist = await prisma.profile.findFirst({
          where: { id: Number(artistId) },
        });
        res.json({ result: artist });
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
    const { artistId } = req.params as unknown as Params;
    assertLoggedIn(req);
    const user = req.user;

    const castArtistId = await findArtistIdForURLSlug(artistId);
    try {
      const artist = await prisma.profile.findFirst({
        where: {
          id: Number(castArtistId),
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

      if (!artist) {
        return res.status(404).json({
          error: "Artist not found",
        });
      } else {
        return res.json({
          result: processSingleArtist(artist, Number(user.id)),
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
    const { artistId } = req.params as unknown as Params;
    assertLoggedIn(req);
    const user = req.user;

    try {
      await deleteArtist(Number(user.id), Number(artistId));
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
