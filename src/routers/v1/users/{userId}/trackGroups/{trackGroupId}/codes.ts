import { User } from "@prisma/client";
import { NextFunction, Request, Response } from "express";
import {
  userAuthenticated,
  userHasPermission,
} from "../../../../../../auth/passport";
import { doesTrackGroupBelongToUser } from "../../../../../../utils/ownership";
import prisma from "../../../../../../../prisma/prisma";
import { randomBytes } from "crypto";
import { range } from "lodash";

type Params = {
  trackGroupId: number;
  userId: string;
};

export default function () {
  const operations = {
    POST: [userAuthenticated, userHasPermission("owner"), POST],
  };

  async function POST(req: Request, res: Response, next: NextFunction) {
    const { trackGroupId } = req.params as unknown as Params;
    const codes = req.body as unknown as { group: string; quantity: number }[];

    const loggedInUser = req.user as User;
    try {
      const trackGroup = await doesTrackGroupBelongToUser(
        Number(trackGroupId),
        loggedInUser.id
      );

      if (trackGroupId) {
        for (const code of codes) {
          await prisma.trackGroupDownloadCodes.createMany({
            data: range(code.quantity).map(() => ({
              trackGroupId: trackGroup.id,
              downloadCode: randomBytes(20).toString("hex").substring(0, 8),
              group: code.group,
            })),
          });
        }
      }

      res.json({
        result: "Success",
      });
    } catch (error) {
      next(error);
    }
  }

  POST.apiDoc = {
    summary: "Create codes for a trackGroup",
    parameters: [
      {
        in: "path",
        name: "userId",
        required: true,
        type: "string",
      },
      {
        in: "path",
        name: "trackGroupId",
        required: true,
        type: "string",
      },
      {
        in: "body",
        name: "codes",
        schema: {
          description: "The codes to add",
          type: "array",
          items: {
            type: "object",
          },
        },
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
