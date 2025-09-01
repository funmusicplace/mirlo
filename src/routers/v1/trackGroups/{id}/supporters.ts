import { Request, Response } from "express";

import prisma from "@mirlo/prisma";
import { findSales } from "../../artists/{id}/supporters";

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
      const trackGroup = await prisma.trackGroup.findFirst({
        where: {
          id: Number(id),
        },
        include: {
          artist: true,
        },
      });

      if (!trackGroup) {
        return res.status(404).json({
          error: "Track group not found",
        });
      }

      const results: { amount: number; datePurchased: Date; userId: number }[] =
        await findSales({
          artistId: [trackGroup.artist.id],
          sinceDate: sinceDate as string,
          filters: { trackGroupIds: [Number(id)] },
        });

      if (trackGroup.fundraisingGoal && trackGroup.isAllOrNothing) {
        // Handle all-or-nothing fundraising logic
        const pledges = await prisma.trackGroupPledge.findMany({
          where: {
            trackGroupId: Number(id),
          },
        });
        results.push(
          ...pledges.map((pledge) => ({
            ...pledge,
            amount: pledge.amount,
            datePurchased: pledge.createdAt,
            urlSlug: trackGroup.urlSlug,
          }))
        );
      }

      res.json({
        results: results.slice(Number(skip), Number(take)).map((r) => {
          // Strip user ids from results
          return {
            ...r,
            userId: undefined,
          };
        }),
        total: results.length,
        totalAmount: results.reduce((acc, curr) => acc + curr.amount, 0),
        totalSupporters: Object.keys(
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
        ).length,
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
