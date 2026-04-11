import { Request, Response } from "express";

import prisma from "@mirlo/prisma";
import { userAuthenticated } from "../../../auth/passport";
import { findSales } from "../artists/{id}/supporters";
import { User } from "@mirlo/prisma/client";
import { downloadCSVFile } from "../../../utils/download";
import { getDateRange } from "../../../utils/dateRange";

export default function () {
  const operations = {
    GET: [userAuthenticated, GET],
  };

  async function GET(req: Request, res: Response) {
    let {
      take = 50,
      skip = 0,
      artistIds = undefined,
      trackGroupIds = undefined,
      datePurchased = undefined,
    } = req.query as {
      take: number | string;
      skip: number | string;
      artistIds?: string | string[] | number[] | undefined;
      trackGroupIds?: string | string[] | number[] | undefined;
      datePurchased?: string;
    };

    const user = req.user as User;

    try {
      if (!artistIds) {
        artistIds = (
          await prisma.artist.findMany({
            where: {
              userId: user.id,
            },
          })
        ).map((a) => a.id);
      } else if (typeof artistIds === "string") {
        // If artistIds is a string, split it into an array
        artistIds = artistIds.split(",");
      }

      if (typeof trackGroupIds === "string") {
        // If trackGroupIds is a string, split it into an array
        trackGroupIds = trackGroupIds.split(",");
      }

      let sinceDate: string | undefined;
      let untilDate: string | undefined;

      const dateRange = getDateRange(datePurchased);
      if (dateRange) {
        sinceDate = dateRange.gte;
        untilDate = dateRange.lt;
      }

      const results = await findSales({
        artistId: artistIds.map((a) => Number(a)),
        sinceDate,
        untilDate,
        filters: trackGroupIds
          ? {
              trackGroupIds: trackGroupIds.map((tg) => Number(tg)),
            }
          : undefined,
      });

      const slicedResults = results.slice(
        Number(skip),
        Number(skip) + Number(take)
      );

      if (req.query?.format === "csv") {
        const csvData = slicedResults.map((r) => ({
          ...r,
          artist: Array.isArray(r.artist)
            ? r.artist
                .map((a: any) => a?.name)
                .filter(Boolean)
                .join(", ")
            : r.artist,
        }));
        return downloadCSVFile(res, "sales.csv", csvColumns, csvData);
      }

      res.json({
        results: slicedResults.map((r) => {
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
    summary: "Returns sales for a user",
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

const csvColumns = [
  { label: "Date", value: "datePurchased" },
  { label: "Artist", value: "artist" },
  { label: "Type", value: "saleType" },
  { label: "Title", value: "title" },
  { label: "Amount", value: "amount" },
  { label: "Platform Cut", value: "platformCut" },
  { label: "Payment Processor Cut", value: "paymentProcessorCut" },
  { label: "Currency", value: "currency" },
];
