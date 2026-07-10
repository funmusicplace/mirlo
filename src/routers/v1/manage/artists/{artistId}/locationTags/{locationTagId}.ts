import { NextFunction, Request, Response } from "express";
import prisma from "@mirlo/prisma";
import {
  userAuthenticated,
  artistBelongsToLoggedInUser,
} from "../../../../../../auth/passport";

export default function () {
  const operations = {
    DELETE: [userAuthenticated, artistBelongsToLoggedInUser, DELETE],
  };

  async function DELETE(req: Request, res: Response, next: NextFunction) {
    try {
      const { artistId: artistIdParam, locationTagId } = req.params;
      const profileId = parseInt(artistIdParam, 10);
      const locTagId = parseInt(locationTagId, 10);

      await prisma.profileLocationTag.deleteMany({
        where: { profileId, locationTagId: locTagId },
      });

      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }

  DELETE.apiDoc = {
    summary: "Remove a location tag from an artist",
    tags: ["Artists", "Location Tags"],
    parameters: [
      {
        in: "path",
        name: "artistId",
        required: true,
        type: "integer",
        description: "Artist ID",
      },
      {
        in: "path",
        name: "locationTagId",
        required: true,
        type: "integer",
        description: "Location tag ID",
      },
    ],
    responses: {
      200: {
        description: "Location tag removed from artist",
        schema: {
          type: "object",
          properties: {
            success: {
              type: "boolean",
            },
          },
        },
      },
    },
  };

  return operations;
}
