import { User } from "@mirlo/prisma/client";
import { NextFunction, Request, Response } from "express";
import {
  contentBelongsToLoggedInUserArtist,
  userAuthenticated,
} from "../../../../../auth/passport";
import prisma from "@mirlo/prisma";
import {
  getUserCountry,
  getUserCurrencyString,
} from "../../../../../utils/user";
import { processSingleMerch } from "../../../../../utils/merch";

export default function () {
  const operations = {
    GET: [userAuthenticated, contentBelongsToLoggedInUserArtist, GET],
    POST: [userAuthenticated, contentBelongsToLoggedInUserArtist, POST],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { artistId } = req.params;
    try {
      const results = await prisma.merch.findMany({
        where: {
          artistId: Number(artistId),
          deletedAt: null,
        },
        include: {
          artist: true,
          images: true,
          optionTypes: { include: { options: true } },
        },
      });

      res.json({
        results: results.map(processSingleMerch),
      });
    } catch (e) {
      next(e);
    }
  }

  GET.apiDoc = {
    summary: "Get all merch belonging to a user",
    parameters: [
      {
        in: "query",
        name: "artistId",
        type: "number",
      },
    ],
    responses: {
      200: {
        description: "Got all merch merch",
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

  async function POST(req: Request, res: Response, next: NextFunction) {
    const { title, description, artistId } = req.body;
    const user = req.user as User;

    try {
      const currencyString = await getUserCurrencyString(user.id);

      const result = await prisma.merch.create({
        data: {
          title,
          description: description ?? "",
          artist: { connect: { id: artistId } },
          minPrice: 0,
          currency: currencyString,
          quantityRemaining: 0,
          isPublic: false,
        },
      });

      const country = await getUserCountry(user.id);

      await prisma.merchShippingDestination.create({
        data: {
          merchId: result.id,
          costUnit: 0,
          costExtraUnit: 0,
          currency: currencyString,
          homeCountry: country?.countryCode ?? "us",
        },
      });

      const created = await prisma.merch.findFirst({
        where: { id: result.id },
      });
      return res.json({ result: created });
    } catch (e) {
      next(e);
    }
  }

  POST.apiDoc = {
    summary: "Creates a trackGroup belonging to a user",
    parameters: [
      {
        in: "path",
        name: "artistId",
        required: true,
        type: "number",
      },
      {
        in: "body",
        name: "trackGroup",
        schema: {
          $ref: "#/definitions/TrackGroup",
        },
      },
    ],
    responses: {
      200: {
        description: "Created trackgroup",
        schema: {
          $ref: "#/definitions/TrackGroup",
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
