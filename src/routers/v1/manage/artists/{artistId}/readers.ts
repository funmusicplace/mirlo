import { NextFunction, Request, Response } from "express";

import {
  artistBelongsToLoggedInUser,
  userAuthenticated,
} from "../../../../../auth/passport";
import { listArtistReaders } from "../../../../../utils/payments/readers";

export default function () {
  const operations = {
    GET: [userAuthenticated, artistBelongsToLoggedInUser, GET],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { artistId } = req.params;

    try {
      const results = await listArtistReaders(Number(artistId));
      res.status(200).json({ results });
    } catch (e) {
      next(e);
    }
  }

  GET.apiDoc = {
    summary: "List the artist's Stripe Terminal readers",
    description:
      "Card readers registered on the artist's connected Stripe account, for picking a dispatch target on the point-of-sale page.",
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
        description: "Registered terminal readers",
        schema: {
          type: "object",
          properties: {
            results: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  label: { type: "string" },
                  deviceType: { type: "string" },
                  status: {
                    type: "string",
                    description: "online or offline",
                  },
                },
              },
            },
          },
        },
      },
      401: { description: "Not logged in" },
      404: {
        description:
          "Artist not found or user does not have permission to edit it",
      },
      default: {
        description: "An error occurred",
        schema: { additionalProperties: true },
      },
    },
  };

  return operations;
}
