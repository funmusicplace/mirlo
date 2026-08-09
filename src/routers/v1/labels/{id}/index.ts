import prisma from "@mirlo/prisma";
import { NextFunction, Request, Response } from "express";

import { userLoggedInWithoutRedirect } from "../../../../auth/passport";
import { findProfileIdForURLSlug } from "../../../../utils/artist";
import { serializeProfile } from "../../../../serializers/artist";
import { whereForPublishedTrackGroups } from "../../../../utils/trackGroup";

export default function () {
  const operations = {
    GET: [userLoggedInWithoutRedirect, GET],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { id }: { id?: string } = req.params;

    try {
      const labelId = await findProfileIdForURLSlug(id);

      const label = await prisma.profile.findFirst({
        where: {
          id: labelId,
          isLabelProfile: true,
          deletedAt: null,
          user: { isLabelAccount: true, deletedAt: null },
        },
        include: {
          background: true,
          avatar: true,
        },
      });

      if (!label) {
        return res.status(404).json({ error: "Label not found" });
      }

      const labelUser = await prisma.user.findUnique({
        where: { id: label?.userId, isLabelAccount: true },
        select: {
          name: true,
          id: true,
          currency: true,
          userAvatar: true,
          userBanner: true,
          properties: true,
          artistLabels: {
            where: {
              isArtistApproved: true,
              isLabelApproved: true,
              artist: { deletedAt: null },
            },
            orderBy: [{ orderIndex: { sort: "asc", nulls: "last" } }],
            include: {
              artist: {
                include: {
                  avatar: {
                    where: {
                      deletedAt: null,
                    },
                  },
                  background: {
                    where: {
                      deletedAt: null,
                    },
                  },
                  trackGroups: {
                    where: whereForPublishedTrackGroups(),
                    include: {
                      cover: true,
                      tracks: true,
                    },
                    orderBy: {
                      releaseDate: "desc",
                    },
                  },
                },
              },
            },
          },
        },
      });
      res.json({
        result: {
          ...labelUser,
          artistLabels: labelUser?.artistLabels.map((al) => ({
            ...al,
            artist: serializeProfile(al.artist),
          })),
          profile: label && serializeProfile(label),
        },
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
