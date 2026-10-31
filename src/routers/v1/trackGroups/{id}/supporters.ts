import prisma from "@mirlo/prisma";
import { Request, Response } from "express";

import { findSales } from "../../../../utils/sales";

export default function () {
  const operations = {
    GET: [GET],
  };

  async function GET(req: Request, res: Response) {
    let { id }: { id?: string } = req.params;
    const { sinceDate } = req.query as {
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
        profileId: [trackGroup.profile.id],
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

      res.json({
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
    summary: "Returns support totals for this trackGroup",
    responses: {
      200: {
        description: "Sale and pledge totals",
        schema: {
          type: "object",
          properties: {
            total: { type: "number" },
            totalAmount: { type: "number" },
            totalSupporters: { type: "number" },
            totalPledges: { type: "number" },
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
