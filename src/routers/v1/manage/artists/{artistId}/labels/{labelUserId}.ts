import { NextFunction, Request, Response } from "express";
import {
  User,
  Prisma,
  TrackGroup,
  Post,
  Artist,
  ArtistSubscriptionTier,
} from "@mirlo/prisma/client";

import prisma from "@mirlo/prisma";
import {
  artistBelongsToLoggedInUser,
  userAuthenticated,
} from "../../../../../../auth/passport";
import { AppError } from "../../../../../../utils/error";

export default function () {
  const operations = {
    DELETE: [userAuthenticated, artistBelongsToLoggedInUser, DELETE],
  };

  async function DELETE(req: Request, res: Response, next: NextFunction) {
    let { artistId, labelUserId }: { artistId?: string; labelUserId?: string } =
      req.params;

    try {
      if (!labelUserId) {
        throw new AppError({ httpCode: 400, description: "Need labelUserId" });
      }

      await prisma.artistLabel.deleteMany({
        where: {
          labelUserId: Number(labelUserId),
          artistId: Number(artistId),
        },
      });

      const labels = await prisma.artistLabel.findMany({
        where: {
          artistId: Number(artistId),
        },
      });
      res.json({
        results: labels,
      });
    } catch (e) {
      next(e);
    }
  }

  return operations;
}
