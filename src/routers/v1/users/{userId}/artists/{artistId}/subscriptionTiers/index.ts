import { NextFunction, Request, Response } from "express";
import {
  contentBelongsToLoggedInUserArtist,
  userAuthenticated,
  userHasPermission,
} from "../../../../../../../auth/passport";
import prisma from "../../../../../../../../prisma/prisma";

type Params = {
  artistId: string;
  userId: string;
};

export default function () {
  const operations = {
    GET: [userAuthenticated, userHasPermission("owner"), GET],
    POST: [userAuthenticated, contentBelongsToLoggedInUserArtist, POST],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { artistId } = req.params as unknown as Params;
    const { includeDefault } = req.query as { includeDefault?: boolean };

    try {
      const subscriptions = await prisma.artistSubscriptionTier.findMany({
        where: {
          artistId: Number(artistId),
          ...(includeDefault ? {} : { isDefaultTier: false }),
        },
      });

      res.status(200).json({ results: subscriptions });
    } catch (e) {
      console.error(e);
      res.status(500).json({
        error: "Something went wrong",
      });
    }
  }

  // TODO: GET documentation

  async function POST(req: Request, res: Response) {
    const { artistId } = req.params as unknown as Params;

    try {
      const {
        name,
        description,
        minAmount,
        maxAmount,
        allowVariable,
        defaultAmount,
      } = req.body;
      const subscription = await prisma.artistSubscriptionTier.create({
        data: {
          name,
          artistId: Number(artistId),
          description,
          minAmount,
          maxAmount,
          allowVariable,
          defaultAmount,
        },
      });
      res.json({ subscription });
    } catch (e) {
      res.status(500).json({
        error:
          "Something went wrong while trying to create a artistSubscriptionTier",
      });
    }
  }

  POST.apiDoc = {
    summary: "Creates a artistSubscriptionTier belonging to a user",
    parameters: [
      {
        in: "path",
        name: "userId",
        required: true,
        type: "number",
      },
      {
        in: "body",
        name: "subscription",
        schema: {
          $ref: "#/definitions/ArtistSubscriptionTier",
        },
      },
    ],
    responses: {
      200: {
        description: "Created artistSubscriptionTier",
        schema: {
          $ref: "#/definitions/ArtistSubscriptionTier",
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
