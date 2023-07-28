import { NextFunction, Request, Response } from "express";
import {
  artistBelongsToLoggedInUser,
  userAuthenticated,
} from "../../../../../auth/passport";
import prisma from "../../../../../../prisma/prisma";
import { User } from "@prisma/client";

type Params = {
  subscriptionId: number;
  userId: string;
};

export default function () {
  const operations = {
    DELETE: [userAuthenticated, DELETE],
  };

  async function DELETE(req: Request, res: Response, next: NextFunction) {
    const { userId, subscriptionId } = req.params as unknown as Params;
    const loggedInUser = req.user as User;

    if (loggedInUser.id !== Number(userId)) {
      res.status(401);
      return next();
    }
    try {
      await prisma.artistUserSubscription.deleteMany({
        where: {
          id: Number(subscriptionId),
          userId: Number(userId),
        },
      });
    } catch (e) {
      res.status(400);
      next();
    }
    res.json({ message: "Success" });
  }

  DELETE.apiDoc = {
    summary: "Deletes an subscription belonging to a user",
    parameters: [
      {
        in: "path",
        name: "userId",
        required: true,
        type: "string",
      },
      {
        in: "path",
        name: "subscriptionId",
        required: true,
        type: "string",
      },
    ],
    responses: {
      200: {
        description: "Delete success",
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
