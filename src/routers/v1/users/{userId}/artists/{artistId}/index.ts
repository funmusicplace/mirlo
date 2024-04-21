import { NextFunction, Request, Response } from "express";
import {
  artistBelongsToLoggedInUser,
  userAuthenticated,
} from "../../../../../../auth/passport";
import prisma from "../../../../../../../prisma/prisma";

import {
  deleteArtist,
  findArtistIdForURLSlug,
  processSingleArtist,
  singleInclude,
} from "../../../../../../utils/artist";
import slugify from "slugify";

type Params = {
  artistId: string;
  userId: string;
};

export default function () {
  const operations = {
    PUT: [userAuthenticated, artistBelongsToLoggedInUser, PUT],
    GET: [userAuthenticated, artistBelongsToLoggedInUser, GET],
    DELETE: [userAuthenticated, artistBelongsToLoggedInUser, DELETE],
  };

  async function PUT(req: Request, res: Response) {
    const { userId, artistId } = req.params as unknown as Params;
    const { bio, name, urlSlug, properties, links, location } = req.body;

    try {
      // FIXME: check type of properties object.
      const updatedCount = await prisma.artist.updateMany({
        where: {
          id: Number(artistId),
          userId: Number(userId),
        },
        data: {
          bio,
          name,
          links,
          location,
          ...(urlSlug
            ? { urlSlug: slugify(urlSlug?.toLowerCase(), { strict: true }) }
            : {}),
          properties,
        },
      });

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
      console.error(`users/${userId}/artists/${artistId}`, error);
      res.status(500).json({
        error: `Artist with ID ${artistId} does not exist for user ${userId}`,
      });
    }
  }

  PUT.apiDoc = {
    summary: "Updates an artist belonging to a user",
    parameters: [
      {
        in: "path",
        name: "userId",
        required: true,
        type: "string",
      },
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
    const { userId, artistId } = req.params as unknown as Params;
    const castArtistId = await findArtistIdForURLSlug(artistId);
    try {
      if (userId) {
        const artist = await prisma.artist.findFirst({
          where: {
            id: Number(castArtistId),
            userId: Number(userId),
          },
          include: singleInclude(),
        });

        if (!artist) {
          res.status(404).json({
            error: "Artist not found",
          });
        } else {
          res.json({
            result: processSingleArtist(artist, Number(userId)),
          });
        }
      } else {
        res.status(400).json({
          error: "Invalid route",
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
        name: "userId",
        required: true,
        type: "string",
      },
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
    const { userId, artistId } = req.params as unknown as Params;

    try {
      await deleteArtist(Number(userId), Number(artistId));
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
        name: "userId",
        required: true,
        type: "string",
      },
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
