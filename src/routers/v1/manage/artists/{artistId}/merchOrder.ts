import prisma from "@mirlo/prisma";
import { NextFunction, Request, Response } from "express";

import {
  artistBelongsToLoggedInUser,
  userAuthenticated,
} from "../../../../../auth/passport";

export default function () {
  const operations = {
    PUT: [userAuthenticated, artistBelongsToLoggedInUser, PUT],
  };

  async function PUT(req: Request, res: Response, next: NextFunction) {
    const { merchIds } = req.body;
    try {
      await Promise.all(
        merchIds.map(async (merchId: string, idx: number) => {
          await prisma.merch.update({
            where: {
              id: merchId,
            },
            data: {
              order: idx + 1,
            },
          });
        })
      );

      const updatedMerch = await prisma.merch.findMany({
        where: {
          id: {
            in: merchIds,
          },
        },
      });

      res.json({ results: updatedMerch });
    } catch (error) {
      next(error);
    }
  }

  PUT.apiDoc = {
    summary: "Updates the order of merch",
    parameters: [
      {
        in: "path",
        name: "artistId",
        required: true,
        type: "string",
      },
      {
        in: "body",
        name: "merchIds",
        required: true,
        schema: {
          type: "object",
          required: ["merchIds"],
          properties: {
            merchIds: {
              type: "array",
              items: {
                type: "string",
              },
            },
          },
        },
      },
    ],
    responses: {
      200: {
        description: "Updated merch",
        schema: {
          type: "array",
          items: {
            $ref: "#/definitions/Merch",
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
