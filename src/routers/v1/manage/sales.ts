import { Request, Response } from "express";

import prisma from "@mirlo/prisma";
import { userAuthenticated } from "../../../auth/passport";
import { findSales } from "../artists/{id}/supporters";
import { User } from "@mirlo/prisma/client";

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
    } = req.query as {
      take: number | string;
      skip: number | string;
      artistIds?: string | string[] | number[] | undefined;
      trackGroupIds?: string | string[] | number[] | undefined;
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

      const results = await findSales({
        artistId: artistIds.map((a) => Number(a)),
        filters: trackGroupIds
          ? {
              trackGroupIds: trackGroupIds.map((tg) => Number(tg)),
            }
          : undefined,
      });

      console.log(" Found sales:", results.length);
      const slicedResults = results.slice(
        Number(skip),
        Number(skip) + Number(take)
      );
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
