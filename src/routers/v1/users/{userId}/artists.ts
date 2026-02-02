import { User } from "@mirlo/prisma/client";
import { Request, Response } from "express";
import {
  userAuthenticated,
  userHasPermission,
} from "../../../../auth/passport";
import prisma from "@mirlo/prisma";

type Params = {
  userId: string;
};

export default function () {
  const operations = {
    GET: [userAuthenticated, userHasPermission("owner"), GET],
  };

  async function GET(req: Request, res: Response) {
    const { userId } = req.params as unknown as Params;

    const artists = await prisma.artist.findMany({
      where: {
        userId: Number(userId),
        deletedAt: null,
      },
      include: {
        trackGroups: {
          where: {
            deletedAt: null,
          },
          select: {
            title: true,
            id: true,
            urlSlug: true,
          },
        },
      },
    });

    res.json({ results: artists });
  }

  GET.apiDoc = {
    summary: "Returns user artists",
    parameters: [
      {
        in: "path",
        name: "userId",
        required: true,
        type: "string",
      },
    ],
    responses: {
      200: {
        description: "Artists that belong to the user",
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
