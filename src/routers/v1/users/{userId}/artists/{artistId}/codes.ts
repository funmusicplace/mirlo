import { User } from "@prisma/client";
import { NextFunction, Request, Response } from "express";
import {
  userAuthenticated,
  userHasPermission,
} from "../../../../../../auth/passport";

import prisma from "../../../../../../../prisma/prisma";

type Params = {
  artistId: string;
};

export default function () {
  const operations = {
    GET: [userAuthenticated, userHasPermission("owner"), GET],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { artistId } = req.params as unknown as Params;

    try {
      const artistCodes = await prisma.trackGroupDownloadCodes.findMany({
        where: {
          trackGroup: {
            artistId: Number(artistId),
            deletedAt: null,
          },
        },
        include: {
          trackGroup: true,
        },
      });

      res.json({
        results: artistCodes,
      });
    } catch (error) {
      next(error);
    }
  }

  GET.apiDoc = {
    summary: "Get all codes for an artist",
    parameters: [
      {
        in: "path",
        name: "userId",
        required: true,
        type: "string",
      },
      {
        in: "path",
        name: "artistId",
        required: true,
        type: "string",
      },
    ],
    responses: {
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
