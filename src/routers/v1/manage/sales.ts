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
      take = 20,
      skip = 0,
      artistIds = undefined,
    } = req.query as {
      take: number | string;
      skip: number | string;
      artistIds?: string[] | number[] | undefined;
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
      }
      const results = await findSales(artistIds.map((a) => Number(a)));

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
