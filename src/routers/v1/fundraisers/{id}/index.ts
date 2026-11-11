import prisma from "@mirlo/prisma";
import { NextFunction, Request, Response } from "express";

import { userLoggedInWithoutRedirect } from "../../../../auth/passport";
import { serializeFundraiser } from "../../../../serializers/fundraiser";
import { AppError } from "../../../../utils/error";
import {
  publicFundraiserImagesInclude,
  getFundraiserTotals,
  whereForPublicFundraiser,
} from "../../../../utils/fundraiser";
import { resolvePayee } from "../../../../utils/payments/payee";
import { getCurrency, minimumPledge } from "../../../../utils/stripe/currency";
import { whereForPublishedTrackGroups } from "../../../../utils/trackGroup";

export default function () {
  const operations = {
    GET: [userLoggedInWithoutRedirect, GET],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { id } = req.params;
    const { artistId } = req.query as { artistId?: string };

    try {
      const fundraiser = await prisma.fundraiser.findFirst({
        where: whereForPublicFundraiser({
          idOrSlug: id,
          artistIdOrSlug: artistId,
          includeHiddenProfiles: req.user?.isAdmin,
        }),
        include: {
          images: publicFundraiserImagesInclude,
          profile: {
            select: {
              id: true,
              name: true,
              urlSlug: true,
              userId: true,
              paymentToUserId: true,
              defaultPlatformFee: true,
              avatar: true,
              user: { select: { currency: true, stripeAccountId: true } },
              paymentToUser: { select: { stripeAccountId: true } },
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

      const { pledges, profile, ...rest } = fundraiser;
      const currency = await getCurrency(
        fundraiser.profileId,
        resolvePayee({ profile }).stripeAccountId ?? undefined
      );
      res.json({
        result: {
          ...serializeFundraiser({
            ...rest,
            profile: {
              ...profile,
              user: { currency: profile.user.currency },
              paymentToUser: undefined,
            },
          }),
          currency,
          recentPledges: pledges,
          minPledge: minimumPledge(fundraiser.minPledge, currency),
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
