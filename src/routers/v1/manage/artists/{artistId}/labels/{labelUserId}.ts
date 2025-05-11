import { NextFunction, Request, Response } from "express";

import prisma from "@mirlo/prisma";
import {
  artistBelongsToLoggedInUser,
  userAuthenticated,
} from "../../../../../../auth/passport";
import { AppError } from "../../../../../../utils/error";

export default function () {
  const operations = {
    DELETE: [userAuthenticated, artistBelongsToLoggedInUser, DELETE],
    PUT: [userAuthenticated, artistBelongsToLoggedInUser, PUT],
  };
  async function PUT(req: Request, res: Response, next: NextFunction) {
    let { artistId, labelUserId }: { artistId?: string; labelUserId?: string } =
      req.params;

    try {
      const { isArtistApproved } = req.body;

      await prisma.artistLabel.updateMany({
        where: {
          labelUserId: Number(labelUserId),
          artistId: Number(artistId),
        },
        data: {
          isArtistApproved,
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
