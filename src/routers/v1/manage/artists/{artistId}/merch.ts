import prisma from "@mirlo/prisma";
import { NextFunction, Request, Response } from "express";

import { assertLoggedIn } from "../../../../../auth/getLoggedInUser";
import {
  profileBelongsToLoggedInUser,
  canUserCreateProfiles,
  userAuthenticated,
} from "../../../../../auth/passport";
import { getPlatformFeeForProfile } from "../../../../../utils/artist";
import { processSingleMerch } from "../../../../../utils/merch";
import { getUserCountry } from "../../../../../utils/user";

export default function () {
  const operations = {
    GET: [userAuthenticated, profileBelongsToLoggedInUser, GET],
    POST: [
      userAuthenticated,
      profileBelongsToLoggedInUser,
      canUserCreateProfiles,
      POST,
    ],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { artistId: profileId } = req.params;
    try {
      const results = await prisma.merch.findMany({
        where: {
          profileId: Number(profileId),
          deletedAt: null,
        },
        orderBy: [
          { order: { sort: "asc", nulls: "last" } },
          { createdAt: "asc" },
        ],
        include: {
          profile: { include: { user: { select: { currency: true } } } },
          images: true,
          optionTypes: { include: { options: true } },
        },
      });

      res.json({
        results: results.map((m) => processSingleMerch(m)),
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
    const profileId = Number(req.params.artistId);
    const { title, description } = req.body;
    assertLoggedIn(req);
    const user = req.user;

    try {
      const result = await prisma.merch.create({
        data: {
          title,
          description: description ?? "",
          profile: { connect: { id: profileId } },
          minPrice: 0,
          isPublic: false,
          platformPercent: await getPlatformFeeForProfile(profileId),
        },
      });

      const country = await getUserCountry(user.id);

      await prisma.merchShippingDestination.create({
        data: {
          merchId: result.id,
          costUnit: 0,
          costExtraUnit: 0,
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
