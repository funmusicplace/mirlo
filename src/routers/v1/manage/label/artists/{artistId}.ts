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
    let { artistId: artistProfileId }: { artistId?: string; labelUserId?: string } =
      req.params;
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

      const artistProfile = await prisma.profile.findUnique({
        where: {
          id: Number(artistProfileId),
        },
      });

      await prisma.artistLabel.updateMany({
        where: {
          labelUserId: Number(labelUserId),
          artistId: Number(artistProfileId),
        },
        data: {
          isLabelApproved,
          canLabelAddReleases:
            Number(labelUserId) === loggedInUser.id &&
            loggedInUser.id === artistProfile?.userId,
          canLabelManageArtist:
            Number(labelUserId) === loggedInUser.id &&
            loggedInUser.id === artistProfile?.userId,
        },
      });

      const labels = await prisma.artistLabel.findMany({
        where: {
          artistId: Number(artistProfileId),
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
