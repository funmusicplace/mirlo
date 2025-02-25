import { NextFunction, Request, Response } from "express";
import {
  userAuthenticated,
  merchBelongsToLoggedInUser,
} from "../../../../../auth/passport";
import prisma from "@mirlo/prisma";
import countries from "../../../../../utils/country-codes-currencies";
import {
  getUserCountry,
  getUserCurrencyString,
} from "../../../../../utils/user";
import { User } from "@mirlo/prisma/client";

type Params = {
  merchId: string;
  userId: string;
};

export default function () {
  const operations = {
    PUT: [userAuthenticated, merchBelongsToLoggedInUser, PUT],
  };

  async function PUT(req: Request, res: Response, next: NextFunction) {
    const { merchId } = req.params as unknown as Params;
    const optionTypes = req.body as unknown as {
      optionName: string;
      options: { name: string; additionalPrice: string }[];
    }[];

    try {
      await prisma.merchOptionType.deleteMany({
        where: {
          merchId,
        },
      });

      await Promise.all(
        optionTypes.map(async (oType) => {
          await prisma.merchOptionType.create({
            data: {
              merchId,
              optionName: oType.optionName,
              options: {
                createMany: {
                  data: oType.options.map((o) => ({
                    name: o.name,
                    additionalPrice: Number(o.additionalPrice),
                  })),
                },
              },
            },
          });
        })
      );

      const merch = await prisma.merch.findMany({
        where: {
          id: merchId,
        },
        include: {
          optionTypes: {
            include: {
              options: true,
            },
          },
        },
      });
      res.json({
        result: merch,
      });
    } catch (error) {
      next(error);
    }
  }

  PUT.apiDoc = {
    summary: "Replaces the trackgroup's optionTypes",
    parameters: [
      {
        in: "path",
        name: "merchId",
        required: true,
        type: "string",
      },
      {
        in: "body",
        name: "optionTypes",
        schema: {
          description: "The list of optionTypes to add",
          type: "array",
          items: {
            type: "object",
          },
        },
      },
    ],
    responses: {
      200: {
        description: "Updated merch",
        schema: {
          $ref: "#/definitions/Merch",
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
