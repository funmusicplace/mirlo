import { NextFunction, Request, Response } from "express";
import {
  trackGroupBelongsToLoggedInUser,
  userAuthenticated,
} from "../../../../../auth/passport";
import prisma from "@mirlo/prisma";
import { AppError } from "../../../../../utils/error";

type Params = {
  trackGroupId: number;
  userId: string;
};

export default function () {
  const operations = {
    POST: [userAuthenticated, trackGroupBelongsToLoggedInUser, POST],
  };

  async function POST(req: Request, res: Response, next: NextFunction) {
    const { trackGroupId } = req.params as unknown as Params;
    try {
      const trackGroup = await prisma.trackGroup.findFirst({
        where: {
          id: Number(trackGroupId),
        },
        include: {
          fundraiser: true,
        },
      });

      if (!trackGroup) {
        throw new AppError({
          httpCode: 404,
          description: "Track group not found",
        });
      }

      if (trackGroup?.fundraiser) {
        res.json({ result: trackGroup.fundraiser });
        return;
      }

      const newFundraiser = await prisma.fundraiser.create({
        data: {
          name: `${trackGroup.title} Fundraiser`,
          trackGroups: {
            connect: {
              id: trackGroup.id,
            },
          },
        },
        include: {
          trackGroups: true,
        },
      });

      res.json({ result: newFundraiser });
    } catch (error) {
      next(error);
    }
  }

  POST.apiDoc = {
    summary: "Adds a fundraiser to a track group",
    parameters: [
      {
        in: "path",
        name: "trackGroupId",
        required: true,
        type: "string",
      },
    ],
    responses: {
      200: {
        description: "Updated trackgroup",
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
