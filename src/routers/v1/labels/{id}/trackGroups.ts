import { NextFunction, Request, Response } from "express";
import { userLoggedInWithoutRedirect } from "../../../../auth/passport";
import prisma from "@mirlo/prisma";

import {
  processSingleTrackGroup,
  whereForPublishedTrackGroups,
} from "../../../../utils/trackGroup";
import { findArtistIdForURLSlug } from "../../../../utils/artist";
import { User } from "@mirlo/prisma/client";

export default function () {
  const operations = {
    GET: [userLoggedInWithoutRedirect, GET],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { id }: { id?: string } = req.params;
    const { excludeArtistId }: { excludeArtistId?: string } = req.query;
    const loggedInUser = req.user;

    try {
      const artistId = await findArtistIdForURLSlug(id);
      const labelProfile = await prisma.artist.findFirst({
        where: { id: artistId, isLabelProfile: true },
      });
      const where = whereForPublishedTrackGroups();

      if (excludeArtistId) {
        where.artistId = { not: Number(excludeArtistId) };
      }

      const trackGroups = await prisma.trackGroup.findMany({
        where: {
          ...where,
          OR: [
            { paymentToUserId: labelProfile?.userId },
            { artist: { userId: labelProfile?.userId } },
            { artistId: artistId },
          ],
        },
        include: {
          cover: true,
          tracks: { orderBy: { order: "asc" }, where: { deletedAt: null } },
          artist: {
            select: {
              name: true,
              urlSlug: true,
              id: true,
              userId: true,
            },
          },
        },
        orderBy: {
          releaseDate: "desc",
        },
      });
      res.json({
        results: trackGroups.map((tg) =>
          processSingleTrackGroup(tg, { loggedInUserId: loggedInUser?.id })
        ),
      });
    } catch (e) {
      next(e);
    }
  }

  GET.apiDoc = {
    summary: "Returns label information",
    parameters: [
      {
        in: "path",
        name: "id",
        required: true,
        type: "string",
      },
    ],
    responses: {
      200: {
        description: "A label that matches the id",
        schema: {
          $ref: "#/definitions/User",
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

  return operations;
}
