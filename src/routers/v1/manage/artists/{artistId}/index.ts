import { NextFunction, Request, Response } from "express";
import {
  artistBelongsToLoggedInUser,
  userAuthenticated,
} from "../../../../../auth/passport";
import prisma from "@mirlo/prisma";
import { User } from "@mirlo/prisma/client";

import {
  deleteArtist,
  findArtistIdForURLSlug,
  processSingleArtist,
  singleInclude,
} from "../../../../../utils/artist";
import slugify from "slugify";
import { merge, set } from "lodash";

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
      purchaseEntireCatalogMinPrice,
      defaultPlatformFee,
      tourDates,
      shortDescription,
      maxFreePlays,
      announcementText,
    } = req.body;
    const user = req.user as User;

    try {
      const existingArtist = await prisma.artist.findFirst({
        where: {
          id: Number(artistId),
        },
      });
      // FIXME: check type of properties object.
      const oldProperties = existingArtist?.properties || {};

      const updatedCount = await prisma.artist.updateMany({
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
          purchaseEntireCatalogMinPrice,
          defaultPlatformFee,
          shortDescription,
          maxFreePlays,
          announcementText,
          ...(urlSlug
            ? {
                urlSlug: slugify(urlSlug, {
                  locale: user.language ?? undefined,
                  strict: true,
                  lower: true,
                }),
              }
            : {}),
          properties: merge(oldProperties, properties),
        },
      });
      if (tourDates) {
        await prisma.artistTourDate.deleteMany({
          where: {
            artistId: Number(artistId),
          },
        });
        await prisma.artistTourDate.createMany({
          data: tourDates.map((tourDate: any) => ({
            artistId: Number(artistId),
            location: tourDate.location,
            date: new Date(tourDate.date),
            ticketsUrl: tourDate.ticketsUrl,
          })),
        });
      }

      if (updatedCount) {
        const artist = await prisma.artist.findFirst({
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
          $ref: "#/definitions/Artist",
        },
      },
    ],
    responses: {
      200: {
        description: "Updated artist",
        schema: {
          $ref: "#/definitions/Artist",
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
    const user = req.user as User;

    const castArtistId = await findArtistIdForURLSlug(artistId);
    try {
      const artist = await prisma.artist.findFirst({
        where: {
          id: Number(castArtistId),
        },
        include: {
          ...singleInclude(),
          merch: {
            where: {
              deletedAt: null,
            },
            include: { images: true, includePurchaseTrackGroup: true },
          },
        },
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
          $ref: "#/definitions/Artist",
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
    const user = req.user as User;

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
