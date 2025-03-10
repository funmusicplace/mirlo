import { NextFunction, Request, Response } from "express";
import prisma from "@mirlo/prisma";
import { userAuthenticated } from "../../../auth/passport";
import { User } from "@mirlo/prisma/client";

import { AppError } from "../../../utils/error";

export default function () {
  const operations = {
    GET: [userAuthenticated, GET],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { id }: { id?: string } = req.params;
    const user = req.user as User;

    try {
      const paidTip = await prisma.userArtistTip.findFirst({
        where: {
          id,
          userId: user.id,
        },
      });

      if (!paidTip) {
        throw new AppError({
          httpCode: 404,
          description: "Tip not found",
        });
      }

      res.json({
        result: paidTip,
      });
    } catch (e) {
      next(e);
    }
  }

  GET.apiDoc = {
    summary: "Returns UserArtistTip information",
    parameters: [
      {
        in: "path",
        name: "id",
        required: true,
        type: "string",
      },
    ],
    responses: {
      200: {
        description: "A tip that matches the id",
        schema: {
          $ref: "#/definitions/Post",
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
