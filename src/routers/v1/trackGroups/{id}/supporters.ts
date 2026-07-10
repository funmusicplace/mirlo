import prisma from "@mirlo/prisma";
import { Request, Response } from "express";

import { findSales } from "../../artists/{id}/supporters";
import { serializeUserTransaction } from "../../../../serializers/userTransaction";

export default function () {
  const operations = {
    GET: [GET],
  };

  async function GET(req: Request, res: Response) {
    let { id }: { id?: string } = req.params;
    let {
      take = 20,
      skip = 0,
      sinceDate,
    } = req.query as {
      take: number | string;
      skip: number | string;
      sinceDate?: string | undefined;
    };

    try {
      let pledges = [];
      const trackGroup = await prisma.trackGroup.findFirst({
        where: {
          id: Number(id),
        },
        include: {
          profile: true,
          fundraiser: true,
        },
      });

      if (!trackGroup) {
        return res.status(404).json({
          error: "Track group not found",
        });
      }

      const sales = await findSales({
        artistId: [trackGroup.profile.id],
        sinceDate: sinceDate as string,
        filters: { trackGroupIds: [Number(id)] },
      });

      let results: Array<
        | Awaited<ReturnType<typeof findSales>>[number]
        | {
            amount: number;
            datePurchased: string;
            urlSlug: string;
            userId: number;
          }
      > = [...sales];

      if (
        trackGroup.fundraiser &&
        trackGroup.fundraiser.goalAmount &&
        trackGroup.fundraiser.isAllOrNothing
      ) {
        // Handle all-or-nothing fundraising logic
        pledges = await prisma.fundraiserPledge.findMany({
          where: {
            fundraiserId: Number(trackGroup.fundraiser.id),
            cancelledAt: null,
          },
        });
        results.push(
          ...pledges.map((pledge) => ({
            ...pledge,
            amount: pledge.amount,
            datePurchased: pledge.createdAt.toISOString(),
            urlSlug: trackGroup.urlSlug,
          }))
        );
      }

      const total = results.length;
      const totalAmount = results.reduce((acc, curr) => acc + curr.amount, 0);
      const totalSupporters = Object.keys(
        results.reduce(
          (acc, curr) => {
            if (acc[curr.userId]) {
              return acc;
            } else {
              return {
                ...acc,
                [curr.userId]: 1,
              };
            }
          },
          {} as Record<number, number>
        )
      ).length;

      const page = results.slice(Number(skip), Number(take)).map((r) => ({
        ...r,
        userId: undefined,
      }));

      const apiResults = page.map((ut) => {
        if (!("trackGroupPurchases" in ut)) {
          return ut;
        }
        return serializeUserTransaction(ut);
      });

      res.json({
        results: apiResults,
        total,
        totalAmount,
        totalSupporters,
        totalPledges: pledges.length,
      });
    } catch (e) {
      console.error(`/v1/artists/{id}/followers ${e}`);
      res.status(400);
    }
  }

  GET.apiDoc = {
    summary: "Returns supporters of this trackGroup",
    responses: {
      200: {
        description: "A list of published posts",
        schema: {
          type: "array",
          items: {
            $ref: "#/definitions/Post",
          },
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
