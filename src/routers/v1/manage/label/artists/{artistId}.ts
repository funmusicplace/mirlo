import { NextFunction, Request, Response } from "express";

import prisma from "@mirlo/prisma";
import { userAuthenticated } from "../../../../../auth/passport";
import { assertLoggedIn } from "../../../../../auth/getLoggedInUser";
import { AppError } from "../../../../../utils/error";

export default function () {
  const operations = {
    PUT: [userAuthenticated, PUT],
  };
  async function PUT(req: Request, res: Response, next: NextFunction) {
    let { artistId }: { artistId?: string; labelUserId?: string } = req.params;
    let { labelUserId, isLabelApproved } = req.body as unknown as {
      labelUserId?: string;
      isLabelApproved?: boolean;
    };
    assertLoggedIn(req);
    const loggedInUser = req.user;

    try {
      if (Number(labelUserId) !== loggedInUser.id) {
        throw new AppError({
          httpCode: 401,
          description: "You are not allowed to approve this artist",
        });
      }

      const artist = await prisma.artist.findUnique({
        where: {
          id: Number(artistId),
        },
      });

      await prisma.artistLabel.updateMany({
        where: {
          labelUserId: Number(labelUserId),
          artistId: Number(artistId),
        },
        data: {
          isLabelApproved,
          canLabelAddReleases:
            Number(labelUserId) === loggedInUser.id &&
            loggedInUser.id === artist?.userId,
          canLabelManageArtist:
            Number(labelUserId) === loggedInUser.id &&
            loggedInUser.id === artist?.userId,
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
