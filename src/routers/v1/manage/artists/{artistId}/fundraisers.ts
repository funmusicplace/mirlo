import prisma from "@mirlo/prisma";
import { NextFunction, Request, Response } from "express";

import {
  artistBelongsToLoggedInUser,
  userAuthenticated,
  userOrAppAuthenticated,
} from "../../../../../auth/passport";
import { serializeFundraiser } from "../../../../../serializers/fundraiser";
import { AppError } from "../../../../../utils/error";
import {
  generateUniqueFundraiserSlug,
  getFundraiserTotals,
} from "../../../../../utils/fundraiser";

export default function () {
  const operations = {
    GET: [userAuthenticated, artistBelongsToLoggedInUser, GET],
    POST: [userOrAppAuthenticated, artistBelongsToLoggedInUser, POST],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { artistId } = req.params;
    try {
      const fundraisers = await prisma.fundraiser.findMany({
        where: { profileId: Number(artistId) },
        include: {
          trackGroups: {
            where: { deletedAt: null },
            select: { id: true, title: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      const results = await Promise.all(
        fundraisers.map(async (fundraiser) => ({
          ...fundraiser,
          ...(await getFundraiserTotals(fundraiser)),
        }))
      );

      res.json({ results });
    } catch (error) {
      next(error);
    }
  }

  GET.apiDoc = {
    summary: "Lists the artist's fundraisers with how much each has raised",
    parameters: [
      {
        in: "path",
        name: "artistId",
        required: true,
        type: "string",
      },
    ],
    responses: {
      200: {
        description: "The artist's fundraisers",
        schema: {
          type: "object",
          properties: {
            results: {
              type: "array",
              items: { $ref: "#/definitions/Fundraiser" },
            },
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
    const { artistId } = req.params;
    const { trackGroupId, name } = req.body;
    try {
      if (!trackGroupId) {
        if (!name?.trim()) {
          throw new AppError({
            httpCode: 400,
            description: "A fundraiser without a release needs a name",
          });
        }

        const fundraiser = await prisma.fundraiser.create({
          data: {
            name: name.trim(),
            profileId: Number(artistId),
            urlSlug: await generateUniqueFundraiserSlug(
              Number(artistId),
              name.trim()
            ),
          },
        });

        res.json({ result: serializeFundraiser(fundraiser) });
        return;
      }

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

      const fundraiserName = name?.trim() || `${trackGroup.title} Fundraiser`;
      const fundraiser = await prisma.fundraiser.create({
        data: {
          name: fundraiserName,
          urlSlug: await generateUniqueFundraiserSlug(
            trackGroup.profileId,
            fundraiserName
          ),
          minPledge: trackGroup.minPrice ?? 0,
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
    summary:
      "Creates a fundraiser for the artist, optionally for one of its track groups",
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
          properties: {
            trackGroupId: { type: "number" },
            name: {
              type: "string",
              description: "Required when no trackGroupId is given",
            },
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
