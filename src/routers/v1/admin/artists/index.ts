import prisma from "@mirlo/prisma";
import { Prisma } from "@mirlo/prisma/client";
import { NextFunction, Request, Response } from "express";

import {
  userAuthenticated,
  userHasPermission,
} from "../../../../auth/passport";
import { processSingleArtist } from "../../../../utils/serialize/artist";

export default function () {
  const operations = {
    GET: [userAuthenticated, userHasPermission("admin"), GET],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { skip: skipQuery, take, name, acceptPayments, email } = req.query;
    try {
      let where: Prisma.ProfileWhereInput = {
        deletedAt: null,
      };

      if (name && typeof name === "string") {
        where.name = { contains: name, mode: "insensitive" };
      }
      if (acceptPayments) {
        where.user = {
          stripeAccountId: {
            not: null,
          },
        };
      }
      if (email && typeof email === "string") {
        if (!where.user) {
          where.user = {};
        }
        where.user.email = { contains: email, mode: "insensitive" };
      }
      const itemCount = await prisma.profile.count({ where });
      const artists = await prisma.profile.findMany({
        where,
        skip: skipQuery ? Number(skipQuery) : undefined,
        take: take ? Number(take) : undefined,
        include: {
          avatar: true,
          background: true,
          user: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });
      res.json({
        results: artists.map((artist) => processSingleArtist(artist)),
        total: itemCount,
      });
    } catch (e) {
      next(e);
    }
  }

  GET.apiDoc = {
    summary: "Returns all artists",
    responses: {
      200: {
        description: "A list of artists",
        schema: {
          type: "array",
          items: {
            $ref: "#/definitions/Profile",
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
