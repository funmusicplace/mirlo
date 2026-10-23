import prisma from "@mirlo/prisma";
import { NextFunction, Request, Response } from "express";

import {
  artistBelongsToLoggedInUser,
  userOrAppAuthenticated,
} from "../../../../../auth/passport";
import { serializeFundraiser } from "../../../../../serializers/fundraiser";
import { AppError } from "../../../../../utils/error";

export default function () {
  const operations = {
    POST: [userOrAppAuthenticated, artistBelongsToLoggedInUser, POST],
  };

  async function POST(req: Request, res: Response, next: NextFunction) {
    const { artistId } = req.params;
    const { trackGroupId } = req.body;
    try {
      const trackGroup = await prisma.trackGroup.findFirst({
        where: { id: Number(trackGroupId), profileId: Number(artistId) },
        include: { fundraiser: true },
      });

      if (!trackGroup) {
        throw new AppError({
          httpCode: 404,
          description: "Track group not found",
        });
      }

      if (trackGroup.fundraiser) {
        res.json({ result: serializeFundraiser(trackGroup.fundraiser) });
        return;
      }

      const fundraiser = await prisma.fundraiser.create({
        data: {
          name: `${trackGroup.title} Fundraiser`,
          profileId: trackGroup.profileId,
          trackGroups: { connect: { id: trackGroup.id } },
        },
      });

      res.json({ result: serializeFundraiser(fundraiser) });
    } catch (error) {
      next(error);
    }
  }

  POST.apiDoc = {
    summary: "Creates a fundraiser for one of the artist's track groups",
    parameters: [
      {
        in: "path",
        name: "artistId",
        required: true,
        type: "string",
      },
      {
        in: "body",
        name: "fundraiser",
        schema: {
          type: "object",
          required: ["trackGroupId"],
          properties: {
            trackGroupId: { type: "number" },
          },
        },
      },
    ],
    responses: {
      200: {
        description: "Created fundraiser",
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

  return operations;
}
