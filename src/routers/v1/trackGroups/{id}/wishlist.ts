import { User } from "@prisma/client";
import { Request, Response } from "express";
import { userAuthenticated } from "../../../../auth/passport";

import prisma from "../../../../../prisma/prisma";

type Params = {
  id: string;
};

export default function () {
  const operations = {
    POST: [userAuthenticated, POST],
  };

  async function POST(req: Request, res: Response) {
    const { id: trackGroupId } = req.params as unknown as Params;
    let { wishlist } = req.body as unknown as {
      wishlist?: boolean; // In cents
    };
    const loggedInUser = req.user as User;

    try {
      const trackGroup = await prisma.trackGroup.findFirst({
        where: {
          id: Number(trackGroupId),
        },
        include: {
          cover: true,
        },
      });

      if (!trackGroup) {
        return res.status(404).json({ error: "Release does not exist" });
      }

      const exists = await prisma.userTrackGroupWishlist.findFirst({
        where: {
          trackGroupId: Number(trackGroupId),
          userId: loggedInUser.id,
        },
      });

      if (exists && wishlist === false) {
        await prisma.userTrackGroupWishlist.delete({
          where: {
            userId_trackGroupId: {
              userId: loggedInUser.id,
              trackGroupId: Number(trackGroupId),
            },
          },
        });
      } else if (!exists && wishlist === true) {
        await prisma.userTrackGroupWishlist.create({
          data: {
            userId: loggedInUser.id,
            trackGroupId: Number(trackGroupId),
          },
        });
      }

      res.status(200).json({
        message: "Success",
      });
    } catch (e) {
      console.error(e);

      res.status(500).json({
        error: "Something went wrong while buying the track group",
      });
    }
  }

  POST.apiDoc = {
    summary: "Wishlist a TrackGroup",
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
