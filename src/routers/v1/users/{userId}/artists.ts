import prisma from "@mirlo/prisma";
import { Request, Response } from "express";

import {
  userAuthenticated,
  userHasPermission,
} from "../../../../auth/passport";
import { processSingleProfile } from "../../../../serializers/artist";

type Params = {
  userId: string;
};

export default function () {
  const operations = {
    GET: [userAuthenticated, userHasPermission("owner"), GET],
  };

  async function GET(req: Request, res: Response) {
    const { userId } = req.params as unknown as Params;

    const profiles = await prisma.profile.findMany({
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

    res.json({
      results: profiles.map((a) =>
        processSingleProfile(a as Parameters<typeof processSingleProfile>[0])
      ),
    });
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
