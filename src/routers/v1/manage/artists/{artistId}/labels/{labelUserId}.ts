import prisma from "@mirlo/prisma";
import { NextFunction, Request, Response } from "express";

import {
  profileOwnedByLoggedInUser,
  userAuthenticated,
} from "../../../../../../auth/passport";
import { AppError } from "../../../../../../utils/error";
import {
  labelRemovalImpact,
  removeLabelFromArtist,
} from "../../../../../../utils/labelRemoval";

export default function () {
  const operations = {
    GET: [userAuthenticated, profileOwnedByLoggedInUser, GET],
    DELETE: [userAuthenticated, profileOwnedByLoggedInUser, DELETE],
    PUT: [userAuthenticated, profileOwnedByLoggedInUser, PUT],
  };
  async function GET(req: Request, res: Response, next: NextFunction) {
    const { artistId, labelUserId } = req.params;
    try {
      res.json({
        result: await labelRemovalImpact(Number(artistId), Number(labelUserId)),
      });
    } catch (e) {
      next(e);
    }
  }

  GET.apiDoc = {
    summary: "What removing this label would change for the artist",
    responses: {
      200: { description: "Releases, payee and subscriptions affected" },
      default: {
        description: "An error occurred",
        schema: { additionalProperties: true },
      },
    },
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
          canLabelManageArtist: isArtistApproved,
          canLabelAddReleases: isArtistApproved,
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

      await removeLabelFromArtist(Number(artistId), Number(labelUserId));

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
