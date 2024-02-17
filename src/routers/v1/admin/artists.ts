import { Prisma } from "@prisma/client";
import { NextFunction, Request, Response } from "express";
import prisma from "../../../../prisma/prisma";
import { processSingleArtist } from "../../../utils/artist";
import { userAuthenticated, userHasPermission } from "../../../auth/passport";

export default function () {
  const operations = {
    GET: [userAuthenticated, userHasPermission("admin"), GET],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { skip: skipQuery, take, name, acceptPayments } = req.query;
    try {
      let where: Prisma.ArtistWhereInput = {
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
      const itemCount = await prisma.artist.count({ where });

      const artists = await prisma.artist.findMany({
        where,
        skip: skipQuery ? Number(skipQuery) : undefined,
        take: take ? Number(take) : undefined,
        include: {
          avatar: true,
          banner: true,
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
            $ref: "#/definitions/Artist",
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
