import { NextFunction, Request, Response } from "express";
import {
  userAuthenticated,
  userHasPermission,
} from "../../../../auth/passport";
import prisma from "@mirlo/prisma";

type Params = {
  id: string;
};

export default function () {
  const operations = {
    PUT: [userAuthenticated, userHasPermission("admin"), PUT],
  };

  async function PUT(req: Request, res: Response, next: NextFunction) {
    const { id } = req.params as unknown as Params;
    const { adminEnabled, hideFromSearch } = req.body;

    try {
      await prisma.trackGroup.update({
        where: {
          id: Number(id),
        },
        data: {
          adminEnabled,
          hideFromSearch,
        },
      });
      res.status(200).send({
        message: "TrackGroup updated",
      });
    } catch (error) {
      next(error);
    }
  }

  PUT.apiDoc = {
    summary: "Updates an trackGroup",
    parameters: [
      {
        in: "path",
        name: "id",
        required: true,
        type: "string",
      },
    ],
    responses: {
      200: {
        description: "Updated trackGroup",
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
