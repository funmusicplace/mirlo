import { Prisma } from "@mirlo/prisma/client";
import { NextFunction, Request, Response } from "express";
import prisma from "@mirlo/prisma";

export default function () {
  const operations = {
    GET,
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { skip: skipQuery, take = 10, email } = req.query;

    try {
      let where: Prisma.UserWhereInput = {
        isLabelAccount: true,
      };

      if (email && typeof email === "string") {
        where.name = { contains: email, mode: "insensitive" };
      }

      const users = await prisma.user.findMany({
        where,
        skip: skipQuery ? Number(skipQuery) : undefined,
        take: take ? Number(take) : undefined,
        orderBy: {
          name: "desc",
        },
        select: {
          name: true,
          email: true,
          id: true,
          userAvatar: true,
          urlSlug: true,
          artists: {
            where: {
              deletedAt: null,
            },
          },
        },
      });
      res.json({
        results: users,
      });
    } catch (e) {
      next(e);
    }
  }

  GET.apiDoc = {
    summary: "Returns all users that are labels",
    responses: {
      200: {
        description: "A list of users",
        schema: {
          type: "array",
          items: {
            $ref: "#/definitions/User",
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
