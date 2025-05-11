import { User } from "@mirlo/prisma/client";
import { NextFunction, Request, Response } from "express";
import { userAuthenticated } from "../../../../auth/passport";

import prisma from "@mirlo/prisma";

type Params = {
  id: string;
};

export default function () {
  const operations = {
    POST: [userAuthenticated, POST],
  };

  async function POST(req: Request, res: Response, next: NextFunction) {
    const { id: trackId } = req.params as unknown as Params;
    let { favorite } = req.body as unknown as {
      favorite?: boolean; // In cents
    };
    const loggedInUser = req.user as User;

    try {
      const track = await prisma.track.findFirst({
        where: {
          id: Number(trackId),
        },
      });

      if (!track) {
        return res.status(404).json({ error: "Track does not exist" });
      }

      const exists = await prisma.userTrackFavorite.findFirst({
        where: {
          trackId: Number(trackId),
          userId: loggedInUser.id,
        },
      });

      if (exists && favorite === false) {
        await prisma.userTrackFavorite.delete({
          where: {
            userId_trackId: {
              userId: loggedInUser.id,
              trackId: Number(trackId),
            },
          },
        });
      } else if (!exists && favorite === true) {
        await prisma.userTrackFavorite.create({
          data: {
            userId: loggedInUser.id,
            trackId: Number(trackId),
          },
        });
      }

      res.status(200).json({
        message: "Success",
      });
    } catch (e) {
      console.error(e);

      next(e);
    }
  }

  POST.apiDoc = {
    summary: "Favorite a Track",
    parameters: [
      {
        in: "path",
        name: "id",
        required: true,
        type: "number",
      },
      {
        in: "body",
        name: "wishlist",
        schema: {
          type: "object",
          required: [],
          properties: {
            wishlist: {
              type: "boolean",
            },
          },
        },
      },
    ],
    responses: {
      200: {
        description: "purchased artist",
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
