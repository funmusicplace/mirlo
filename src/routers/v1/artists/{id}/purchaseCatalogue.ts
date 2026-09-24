import prisma from "@mirlo/prisma";
import { NextFunction, Request, Response } from "express";

import { calculateCatalogueFloorPrice } from "../../../../utils/catalogue";
import { AppError } from "../../../../utils/error";

type Params = {
  id: string;
};

export default function () {
  const operations = {
    GET: [GET],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { id: profileId } = req.params as unknown as Params;
    try {
      const profile = await prisma.profile.findFirst({
        where: {
          id: Number(profileId),
        },
      });

      if (!profile) {
        throw new AppError({
          httpCode: 404,
          description: `Artist with ID ${profileId} not found`,
        });
      }

      res.status(200).json({
        result: {
          price: await calculateCatalogueFloorPrice(profile),
        },
      });
    } catch (e) {
      next(e);
    }
  }

  GET.apiDoc = {
    summary:
      "Get the current price to buy an artist's entire catalogue, recalculated live",
    parameters: [
      {
        in: "path",
        name: "id",
        required: true,
        type: "number",
      },
    ],
    responses: {
      200: {
        description:
          "The current price in cents. Defaults to the summed minPrice of all purchasable releases if the artist hasn't configured a discount; 0 if there's nothing purchasable",
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
