import prisma from "@mirlo/prisma";
import { NextFunction, Request, Response } from "express";

import {
  profileOwnedByLoggedInUser,
  userAuthenticated,
} from "../../../../../../auth/passport";
import { findProfileIdForURLSlug } from "../../../../../../utils/artist";
import { findProfileManagers } from "../../../../../../utils/profileManagers";

export default function () {
  const operations = {
    DELETE: [userAuthenticated, profileOwnedByLoggedInUser, DELETE],
  };

  async function DELETE(req: Request, res: Response, next: NextFunction) {
    const { artistId, userId } = req.params as {
      artistId: string;
      userId: string;
    };
    try {
      const profileId = Number(await findProfileIdForURLSlug(artistId));
      await prisma.profileManager.deleteMany({
        where: { profileId, userId: Number(userId) },
      });
      res.json({
        results: await findProfileManagers(profileId, { showEmail: true }),
      });
    } catch (e) {
      next(e);
    }
  }

  DELETE.apiDoc = {
    summary:
      "Removes a manager (or cancels a pending invite). Only the artist's owner can do this",
    parameters: [
      { in: "path", name: "artistId", required: true, type: "string" },
      { in: "path", name: "userId", required: true, type: "number" },
    ],
    responses: {
      200: { description: "The updated list of managers" },
      default: {
        description: "An error occurred",
        schema: { additionalProperties: true },
      },
    },
  };

  return operations;
}
