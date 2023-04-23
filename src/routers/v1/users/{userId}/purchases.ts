import { Prisma, User } from "@prisma/client";
import { Request, Response } from "express";
import { userAuthenticated } from "../../../../auth/passport";
import prisma from "../../../../../prisma/prisma";
import trackGroupProcessor from "../../../../utils/trackGroup";

type Params = {
  userId: string;
};

export default function () {
  const operations = {
    GET: [userAuthenticated, GET],
  };

  async function GET(req: Request, res: Response) {
    const { userId } = req.params as unknown as Params;
    const { trackGroupId } = req.query as unknown as { trackGroupId: string };

    const loggedInUser = req.user as User;
    if (Number(userId) === Number(loggedInUser.id)) {
      const where: Prisma.UserTrackGroupPurchaseWhereInput = {
        userId: Number(userId),
      };
      if (trackGroupId) {
        where.trackGroupId = Number(trackGroupId);
      }
      const purchases = await prisma.userTrackGroupPurchase.findMany({
        where,
        include: {
          trackGroup: {
            include: {
              artist: true,
              cover: true,
            },
          },
        },
      });
      res.json({
        results: purchases.map((p) => ({
          ...p,
          trackGroup: trackGroupProcessor.single(p.trackGroup),
        })),
      });
    } else {
      res.status(401);
      res.json({
        error: "Invalid route",
      });
    }
  }

  GET.apiDoc = {
    summary: "Returns user artists",
    parameters: [
      {
        in: "path",
        name: "userId",
        required: true,
        type: "string",
      },
    ],
    responses: {
      200: {
        description: "Subscriptions that belong to the user",
        schema: {
          type: "array",
          items: {
            $ref: "#/definitions/Artist",
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

  return operations;
}
