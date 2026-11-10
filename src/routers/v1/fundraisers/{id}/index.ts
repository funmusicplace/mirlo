import prisma from "@mirlo/prisma";
import { NextFunction, Request, Response } from "express";

import { userLoggedInWithoutRedirect } from "../../../../auth/passport";
import { serializeFundraiser } from "../../../../serializers/fundraiser";
import { whereForVisibleProfile } from "../../../../utils/artist";
import { AppError } from "../../../../utils/error";
import {
  fundraiserImagesInclude,
  getFundraiserTotals,
} from "../../../../utils/fundraiser";
import { minimumPledge } from "../../../../utils/stripe/currency";
import { whereForPublishedTrackGroups } from "../../../../utils/trackGroup";

export default function () {
  const operations = {
    GET: [userLoggedInWithoutRedirect, GET],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { id } = req.params;
    const { artistId } = req.query as { artistId?: string };

    try {
      const byId = /^\d+$/.test(id) ? { id: Number(id) } : undefined;
      const fundraiser = await prisma.fundraiser.findFirst({
        where: {
          isPublic: true,
          profile: {
            ...(req.user?.isAdmin ? {} : whereForVisibleProfile()),
            ...(artistId && !/^\d+$/.test(artistId)
              ? { urlSlug: { equals: artistId, mode: "insensitive" } }
              : artistId
                ? { id: Number(artistId) }
                : {}),
          },
          OR: [
            ...(byId ? [byId] : []),
            ...(artistId
              ? [{ urlSlug: { equals: id, mode: "insensitive" as const } }]
              : []),
          ],
        },
        include: {
          images: fundraiserImagesInclude,
          profile: {
            select: {
              id: true,
              name: true,
              urlSlug: true,
              userId: true,
              paymentToUserId: true,
              defaultPlatformFee: true,
              avatar: true,
              user: { select: { currency: true } },
            },
          },
          pledges: {
            where: { cancelledAt: null },
            orderBy: { createdAt: "desc" },
            take: 6,
            select: { id: true, amount: true, createdAt: true },
          },
          trackGroups: {
            where: whereForPublishedTrackGroups(),
            select: {
              id: true,
              title: true,
              urlSlug: true,
              platformPercent: true,
            },
          },
        },
      });

      if (!fundraiser) {
        throw new AppError({
          httpCode: 404,
          description: "Fundraiser not found",
        });
      }

      const { pledges, ...rest } = fundraiser;
      res.json({
        result: {
          ...serializeFundraiser(rest),
          recentPledges: pledges,
          minPledge: minimumPledge(
            fundraiser.minPledge,
            fundraiser.profile.user?.currency
          ),
          ...(await getFundraiserTotals(fundraiser)),
        },
      });
    } catch (e) {
      next(e);
    }
  }

  GET.apiDoc = {
    summary: "Returns a public fundraiser by id, or by slug with artistId",
    parameters: [
      {
        in: "path",
        name: "id",
        required: true,
        type: "string",
        description:
          "The fundraiser's id, or its URL slug when artistId is given",
      },
      {
        in: "query",
        name: "artistId",
        type: "string",
        description: "The artist's id or URL slug",
      },
    ],
    responses: {
      200: { description: "The fundraiser" },
      404: { description: "No public fundraiser found" },
      default: {
        description: "An error occurred",
        schema: { additionalProperties: true },
      },
    },
  };

  return operations;
}
