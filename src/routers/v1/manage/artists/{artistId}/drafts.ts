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

type Params = {
  artistId: string;
};

export default function () {
  const operations = {
    GET: [userAuthenticated, artistBelongsToLoggedInUser, GET],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { artistId } = req.params as unknown as Params;

    try {
      let draftAlbum = await prisma.trackGroup.findFirst({
        where: {
          isDrafts: true,
        },
      });

      if (!draftAlbum) {
        draftAlbum = await prisma.trackGroup.create({
          data: {
            isDrafts: true,
            urlSlug: "hidden-draft-album",
            artistId: Number(artistId),
          },
          include: {
            tracks: true,
          },
        });
      }

      return res.json({
        result: draftAlbum,
      });
    } catch (error) {
      next(error);
    }
  }

  GET.apiDoc = {
    summary: "Returns artist drafts album",
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
        description: "An TrackGroup that is the artists drafts album",
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
