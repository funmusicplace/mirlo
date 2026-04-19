import { Request, Response } from "express";
import { userAuthenticated } from "../../../../../auth/passport";
import { assertLoggedIn } from "../../../../../auth/getLoggedInUser";
import prisma from "@mirlo/prisma";
import { AppError } from "../../../../../utils/error";

type Params = {
  userId: string;
};

export default function () {
  const operations = {
    GET: [userAuthenticated, GET],
  };

  async function GET(req: Request, res: Response) {
    const { userId } = req.params as unknown as Params;
    assertLoggedIn(req);
    const loggedInUser = req.user;

    if (Number(userId) === Number(loggedInUser.id)) {
      const notifications = await prisma.notification.count({
        where: {
          userId: Number(userId),
          isRead: false,
        },
      });

      res.json({
        result: notifications,
      });
    } else {
      throw new AppError({
        httpCode: 401,
        description: "Invalid access",
      });
    }
  }

  GET.apiDoc = {
    summary: "Returns user notifications",
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
