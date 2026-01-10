import { Artist, User } from "@mirlo/prisma/client";
import { NextFunction, Request, Response } from "express";
import { pick } from "lodash";
import {
  fundraiserBelongsToLoggedInUser,
  userAuthenticated,
} from "../../../../../auth/passport";

import prisma from "@mirlo/prisma";
import { deleteTrackGroup } from "../../../../../utils/trackGroup";
import { AppError } from "../../../../../utils/error";

type Params = {
  fundraiserId: string;
};

export default function () {
  const operations = {
    PUT: [userAuthenticated, fundraiserBelongsToLoggedInUser, PUT],
    DELETE: [userAuthenticated, fundraiserBelongsToLoggedInUser, DELETE],
    GET: [userAuthenticated, fundraiserBelongsToLoggedInUser, GET],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { fundraiserId } = req.params as unknown as Params;

    try {
      const fundraiser = await prisma.fundraiser.findFirst({
        where: {
          id: Number(fundraiserId),
        },
        include: {
          trackGroups: true,
        },
      });

      if (!fundraiser) {
        throw new AppError({
          httpCode: 404,
          description: "Fundraiser not found",
        });
      }

      return res.status(200).json({ result: fundraiser });
    } catch (e) {
      next(e);
    }
  }

  async function PUT(req: Request, res: Response, next: NextFunction) {
    const { fundraiserId } = req.params as unknown as Params;
    const data = req.body;

    try {
      const newValues = pick(data, [
        "name",
        "endDate",
        "goalAmount",
        "isAllOrNothing",
      ]);

      await prisma.fundraiser.updateMany({
        where: { id: Number(fundraiserId) },
        data: newValues,
      });

      let fundraiser = await prisma.fundraiser.findFirst({
        where: { id: Number(fundraiserId) },
      });

      res.json({ result: fundraiser });
    } catch (error) {
      next(error);
    }
  }

  PUT.apiDoc = {
    summary: "Updates a fundraiser belonging to a user",
    parameters: [
      {
        in: "path",
        name: "fundraiserId",
        required: true,
        type: "string",
      },
      {
        in: "body",
        name: "fundraiser",
        schema: {
          $ref: "#/definitions/Fundraiser",
        },
      },
    ],
    responses: {
      200: {
        description: "Updated fundraiser",
        schema: {
          $ref: "#/definitions/Fundraiser",
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

  async function DELETE(req: Request, res: Response, next: NextFunction) {
    const { fundraiserId } = req.params as {
      fundraiserId: string;
    };
    try {
      await prisma.fundraiser.deleteMany({
        where: { id: Number(fundraiserId) },
      });

      return res.json({ message: "Success" });
    } catch (e) {
      next(e);
    }
  }

  DELETE.apiDoc = {
    summary: "Deletes a fundraiser belonging to a user",
    parameters: [
      {
        in: "path",
        name: "fundraiserId",
        required: true,
        type: "string",
      },
    ],
    responses: {
      200: {
        description: "Delete success",
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
