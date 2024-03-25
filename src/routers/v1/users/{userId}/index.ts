import { NextFunction, Request, Response } from "express";
import {
  userAuthenticated,
  userHasPermission,
} from "../../../../auth/passport";
import { Prisma, User } from "@prisma/client";
import prisma from "../../../../../prisma/prisma";
import { deleteUser } from "../../../../utils/user";
import { AppError } from "../../../../utils/error";

export default function () {
  const operations = {
    GET,
    PUT: [userAuthenticated, userHasPermission("owner"), PUT],
    DELETE: [userAuthenticated, userHasPermission("owner"), DELETE],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { userId }: { userId?: string } = req.params;

    try {
      const user = await prisma.user.findUnique({
        where: { id: Number(userId) },
        select: {
          artists: true,
          email: true,
          name: true,
          stripeAccountId: true,
          currency: true,
          isAdmin: true,
        },
      });
      res.json({ result: user });
    } catch (e) {
      next(e);
    }
  }

  GET.apiDoc = {
    summary: "Returns User information",
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
        description: "A user that matches the userId",
        schema: {
          $ref: "#/definitions/User",
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

  async function PUT(req: Request, res: Response, next: NextFunction) {
    const { userId } = req.params as unknown as { userId: string };
    const { email, name, currency } = req.body;
    const user = req.user as User;

    if (user.id !== Number(userId)) {
      res.status(401).json({ error: "Editing invalid user" });
      return next();
    }

    try {
      let data: Prisma.UserUpdateInput = { name, currency };
      if (email) {
        const emailChanged = email !== user.email;
        if (emailChanged) {
          res
            .json({
              error:
                "It's not yet possible to change the user's email via the API",
            })
            .status(400);
        }
      }

      await prisma.user.update({
        select: {
          email: true,
          name: true,
          emailConfirmationToken: true,
          currency: true,
        },
        where: {
          id: Number(userId),
        },
        data,
      });

      res.json(user);
    } catch (e) {
      console.error(`/users/${userId}`, e);
      res.status(400);
    }
  }

  async function DELETE(req: Request, res: Response, next: NextFunction) {
    const user = req.user as User;
    try {
      deleteUser(user.id);
    } catch (e) {
      res.status(400);
      next();
    }
    res.json({ message: "Success" });
  }

  DELETE.apiDoc = {
    summary: "Deletes a user",
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
