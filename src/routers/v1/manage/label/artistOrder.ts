import prisma from "@mirlo/prisma";
import { NextFunction, Request, Response } from "express";

import { assertLoggedIn } from "../../../../auth/getLoggedInUser";
import { userAuthenticated } from "../../../../auth/passport";

export default function () {
  const operations = {
    PUT: [userAuthenticated, PUT],
  };

  async function PUT(req: Request, res: Response, next: NextFunction) {
    assertLoggedIn(req);
    const user = req.user;
    const { artistIds } = req.body as { artistIds?: unknown };

    try {
      if (
        !Array.isArray(artistIds) ||
        artistIds.some((id) => !Number.isFinite(Number(id)))
      ) {
        res
          .status(400)
          .json({ error: "artistIds must be an array of numbers" });
        return;
      }

      await prisma.$transaction(
        artistIds.map((artistId, idx) =>
          prisma.artistLabel.updateMany({
            where: {
              labelUserId: user.id,
              artistId: Number(artistId),
            },
            data: { orderIndex: idx + 1 },
          })
        )
      );

      const artists = await prisma.artistLabel.findMany({
        where: {
          labelUserId: user.id,
          artist: { deletedAt: null },
        },
        orderBy: [{ orderIndex: { sort: "asc", nulls: "last" } }],
        include: { artist: { omit: { apPrivateKey: true } } },
      });

      res.json({ results: artists });
    } catch (e) {
      next(e);
    }
  }

  PUT.apiDoc = {
    summary: "Sets the display order of the label's roster artists",
    parameters: [
      {
        in: "body",
        name: "artistIds",
        required: true,
        schema: {
          type: "object",
          required: ["artistIds"],
          properties: {
            artistIds: {
              type: "array",
              items: { type: "number" },
            },
          },
        },
      },
    ],
    responses: {
      200: {
        description: "Updated label artist relationships",
      },
      default: {
        description: "An error occurred",
        schema: { additionalProperties: true },
      },
    },
  };

  return operations;
}
