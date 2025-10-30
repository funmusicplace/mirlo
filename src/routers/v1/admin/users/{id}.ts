import { User } from "@mirlo/prisma/client";

import { NextFunction, Request, Response } from "express";
import prisma from "@mirlo/prisma";
import {
  userAuthenticated,
  userHasPermission,
} from "../../../../auth/passport";
import { deleteUser } from "../../../../utils/user";

export default function () {
  const operations = {
    PUT: [userAuthenticated, userHasPermission("admin"), PUT],
    GET: [userAuthenticated, userHasPermission("admin"), GET],
    DELETE: [userAuthenticated, userHasPermission("admin"), DELETE],
  };

  async function PUT(req: Request, res: Response, next: NextFunction) {
    const { email, isLabelAccount, isAdmin, featureFlags, canCreateArtists } =
      req.body as {
        email: string;
        isLabelAccount: boolean;
        featureFlags: string[];
        isAdmin: boolean;
        canCreateArtists: boolean;
      };
    try {
      await prisma.user.update({
        where: { id: Number(req.params.id) },
        data: {
          email,
          isLabelAccount,
          featureFlags,
          isAdmin,
          canCreateArtists,
        },
      });
      res.json({
        message: "success",
      });
    } catch (e) {
      next(e);
    }
  }

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { id } = req.params;
    try {
      const user = await prisma.user.findUnique({
        where: { id: Number(id) },
        select: {
          email: true,
          name: true,
          createdAt: true,
          updatedAt: true,
          id: true,
          userAvatar: true,
          artists: true,
          isLabelAccount: true,
          isAdmin: true,
          featureFlags: true,
        },
      });
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({ result: user });
    } catch (e) {
      next(e);
    }
  }

  async function DELETE(req: Request, res: Response, next: NextFunction) {
    const { id } = req.params;
    try {
      await deleteUser(Number(id));
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
        name: "id",
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
