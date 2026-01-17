import { Request, Response, NextFunction } from "express";
import prisma from "@mirlo/prisma";
import { userHasPermission } from "../../../auth/passport";

export default function () {
  const operations = {
    GET: [userHasPermission("admin"), GET],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    try {
      const { limit = 999 } = req.query;

      const pageSize = Math.min(1000, parseInt(limit as string) || 999);

      const fundraisers = await prisma.fundraiser.findMany({
        include: {
          trackGroups: {
            select: {
              id: true,
              title: true,
              artist: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: pageSize,
      });

      res.json({
        result: fundraisers,
      });
    } catch (error) {
      next(error);
    }
  }

  GET.apiDoc = {
    summary: "Get list of fundraisers for admin filtering",
    tags: ["Admin"],
    parameters: [
      {
        name: "limit",
        in: "query",
        description: "Max items to return (default: 999, max: 1000)",
        schema: { type: "integer", minimum: 1, maximum: 1000 },
      },
    ],
    responses: {
      200: {
        description: "List of fundraisers",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                result: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "integer" },
                      title: { type: "string" },
                      artist: {
                        type: "object",
                        properties: {
                          id: { type: "integer" },
                          name: { type: "string" },
                        },
                      },
                      trackGroup: {
                        type: "object",
                        properties: {
                          id: { type: "integer" },
                          title: { type: "string" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      401: {
        description: "Unauthorized",
      },
      403: {
        description: "Forbidden - admin access required",
      },
    },
  };

  return operations;
}
