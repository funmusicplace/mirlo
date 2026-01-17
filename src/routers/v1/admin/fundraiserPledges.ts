import { Request, Response, NextFunction } from "express";
import prisma from "@mirlo/prisma";
import { userAuthenticated, userHasPermission } from "../../../auth/passport";

export default function () {
  const operations = {
    GET: [userAuthenticated, userHasPermission("admin"), GET],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    try {
      const { pledgeStatus, search, page = 1, limit = 20 } = req.query;

      const pageNum = Math.max(1, parseInt(page as string) || 1);
      const pageSize = Math.min(100, parseInt(limit as string) || 20);
      const skip = (pageNum - 1) * pageSize;

      // Build where clause dynamically
      const where: any = {};

      if (pledgeStatus) {
        const status = String(pledgeStatus);
        if (status === "paid") {
          where.paidAt = { not: null };
        } else if (status === "pending") {
          where.paidAt = null;
          where.cancelledAt = null;
        } else if (status === "cancelled") {
          where.cancelledAt = { not: null };
        }
      }

      if (search) {
        where.OR = [
          {
            user: {
              name: {
                contains: search as string,
                mode: "insensitive",
              },
            },
          },
          {
            user: {
              email: {
                contains: search as string,
                mode: "insensitive",
              },
            },
          },
          {
            fundraiser: {
              trackGroups: {
                some: {
                  artist: {
                    name: {
                      contains: search as string,
                      mode: "insensitive",
                    },
                  },
                },
              },
            },
          },
          {
            fundraiser: {
              trackGroups: {
                some: {
                  title: {
                    contains: search as string,
                    mode: "insensitive",
                  },
                },
              },
            },
          },
        ];
      }

      const [pledges, total] = await Promise.all([
        prisma.fundraiserPledge.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            fundraiser: {
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
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          skip,
          take: pageSize,
        }),
        prisma.fundraiserPledge.count({ where }),
      ]);

      res.json({
        results: pledges,
        total,
        page: pageNum,
        limit: pageSize,
        pages: Math.ceil(total / pageSize),
      });
    } catch (error) {
      next(error);
    }
  }

  GET.apiDoc = {
    summary: "Get all fundraiser pledges with admin filtering",
    tags: ["Admin"],
    parameters: [
      {
        name: "page",
        in: "query",
        description: "Page number (default: 1)",
        type: "string",
        minimum: 1,
      },
      {
        name: "limit",
        in: "query",
        description: "Items per page (default: 20, max: 100)",
        type: "string",
        minimum: 1,
        maximum: 100,
      },
      {
        name: "pledgeStatus",
        in: "query",
        description: "Filter by pledge status (paid, pending, cancelled)",
        type: "string",
        enum: ["paid", "pending", "cancelled"],
      },
      {
        name: "search",
        in: "query",
        description:
          "Search by pledger name, email, artist name, or album title",
        type: "string",
      },
    ],
    responses: {
      200: {
        description: "List of fundraiser pledges",
        schema: {
          type: "object",
          properties: {
            pledges: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "integer" },
                  amount: { type: "number" },
                  paidAt: { type: "string", format: "date-time" },
                  cancelledAt: { type: "string", format: "date-time" },
                  createdAt: { type: "string", format: "date-time" },
                  user: {
                    type: "object",
                    properties: {
                      id: { type: "integer" },
                      name: { type: "string" },
                      email: { type: "string" },
                    },
                  },
                  fundraiser: {
                    type: "object",
                    properties: {
                      id: { type: "integer" },
                      title: { type: "string" },
                      trackGroups: {
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
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            total: { type: "integer" },
            page: { type: "integer" },
            limit: { type: "integer" },
            pages: { type: "integer" },
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
