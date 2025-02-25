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
    const destinations = req.body as unknown as {
      destinationCountry: string;
      homeCountry: string;
      costUnit: number;
      costExtraUnit: number;
    }[];
    const user = req.user as User;

    try {
      const currencyString = await getUserCurrencyString(user.id);

      await prisma.merchShippingDestination.deleteMany({
        where: {
          merchId,
        },
      });

      const country = await getUserCountry(user.id);

      await prisma.merchShippingDestination.createMany({
        data: destinations.map((dest) => ({
          merchId,
          homeCountry: dest.homeCountry ?? country?.countryCode ?? "us",
          destinationCountry: dest.destinationCountry,
          costUnit: dest.costUnit,
          currency: currencyString,
          costExtraUnit: dest.costExtraUnit,
        })),
      });

      const merch = await prisma.merch.findMany({
        where: {
          id: merchId,
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
    summary: "Replaces the trackgroup's destinations",
    parameters: [
      {
        in: "path",
        name: "merchId",
        required: true,
        type: "string",
      },
      {
        in: "body",
        name: "destinations",
        schema: {
          description: "The list of destinations to add",
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
