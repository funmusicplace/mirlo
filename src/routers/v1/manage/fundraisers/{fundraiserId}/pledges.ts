import { NextFunction, Request, Response } from "express";
import {
  fundraiserBelongsToLoggedInUser,
  userAuthenticated,
} from "../../../../../auth/passport";
import prisma from "@mirlo/prisma";

type Query = {
  includeCancelled?: string;
};

type Params = {
  fundraiserId: string;
};

export default function () {
  const operations = {
    GET: [userAuthenticated, fundraiserBelongsToLoggedInUser, GET],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { fundraiserId } = req.params as unknown as Params;
    const { includeCancelled } = req.query as unknown as Query;

    try {
      const whereClause: any = {
        fundraiserId: Number(fundraiserId),
      };

      if (includeCancelled !== "true") {
        whereClause.cancelledAt = null;
      }

      const pledges = await prisma.fundraiserPledge.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      res.json({
        results: pledges,
        total: pledges.length,
      });
    } catch (e) {
      next(e);
    }
  }

  GET.apiDoc = {
    summary: "Get all pledges for a fundraiser",
    parameters: [
      {
        in: "path",
        name: "fundraiserId",
        required: true,
        type: "string",
      },
      {
        in: "query",
        name: "includeCancelled",
        type: "string",
        description: "Whether to include cancelled pledges",
      },
    ],
    responses: {
      200: {
        description: "A list of pledges for the fundraiser",
        schema: {
          type: "object",
          properties: {
            results: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "number" },
                  userId: { type: "number" },
                  fundraiserId: { type: "number" },
                  amount: { type: "number" },
                  createdAt: { type: "string" },
                  cancelledAt: { type: "string" },
                  paidAt: { type: "string" },
                  user: {
                    type: "object",
                    properties: {
                      id: { type: "number" },
                      name: { type: "string" },
                      email: { type: "string" },
                      urlSlug: { type: "string" },
                    },
                  },
                },
              },
            },
            total: { type: "number" },
          },
        },
      },
      default: {
        description: "An error occurred",
      },
    },
  };

  return operations;
}
