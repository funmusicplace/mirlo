import prisma from "@mirlo/prisma";
import { NextFunction, Request, Response } from "express";

import { assertLoggedIn } from "../../../../../auth/getLoggedInUser";
import { userAuthenticated } from "../../../../../auth/passport";
import { AppError } from "../../../../../utils/error";
import {
  labelRemovalImpact,
  removeLabelFromArtist,
} from "../../../../../utils/labelRemoval";

export default function () {
  const operations = {
    GET: [userAuthenticated, GET],
    PUT: [userAuthenticated, PUT],
    DELETE: [userAuthenticated, DELETE],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    assertLoggedIn(req);
    try {
      res.json({
        result: await labelRemovalImpact(
          Number(req.params.artistId),
          req.user.id
        ),
      });
    } catch (e) {
      next(e);
    }
  }

  GET.apiDoc = {
    summary: "What removing this artist from your roster would change",
    responses: {
      200: { description: "Releases, payee and subscriptions affected" },
      default: {
        description: "An error occurred",
        schema: { additionalProperties: true },
      },
    },
  };

  async function DELETE(req: Request, res: Response, next: NextFunction) {
    assertLoggedIn(req);
    const artistId = Number(req.params.artistId);
    try {
      const relationship = await prisma.artistLabel.findFirst({
        where: { artistId, labelUserId: req.user.id },
      });
      if (!relationship) {
        throw new AppError({ httpCode: 404, description: "Artist not found" });
      }
      await removeLabelFromArtist(artistId, req.user.id);
      res.json({ message: "Success" });
    } catch (e) {
      next(e);
    }
  }

  DELETE.apiDoc = {
    summary: "Removes an artist from your roster",
    responses: {
      200: { description: "Artist removed" },
      default: {
        description: "An error occurred",
        schema: { additionalProperties: true },
      },
    },
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

      const artist = await prisma.profile.findUnique({
        where: {
          id: Number(artistId),
        },
      });

      const ownsArtist = loggedInUser.id === artist?.userId;

      await prisma.artistLabel.updateMany({
        where: {
          labelUserId: Number(labelUserId),
          artistId: Number(artistId),
        },
        data: {
          isLabelApproved,
          ...(ownsArtist && {
            canLabelAddReleases: true,
            canLabelManageArtist: true,
          }),
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
