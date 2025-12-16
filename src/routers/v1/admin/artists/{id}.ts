import { User } from "@mirlo/prisma/client";

import { NextFunction, Request, Response } from "express";
import prisma from "@mirlo/prisma";
import {
  userAuthenticated,
  userHasPermission,
} from "../../../../auth/passport";
import { deleteUser } from "../../../../utils/user";
import { deleteArtist } from "../../../../utils/artist";

export default function () {
  const operations = {
    PUT: [userAuthenticated, userHasPermission("admin"), PUT],
    GET: [userAuthenticated, userHasPermission("admin"), GET],
    DELETE: [userAuthenticated, userHasPermission("admin"), DELETE],
  };

  async function PUT(req: Request, res: Response, next: NextFunction) {
    const { enabled } = req.body as {
      enabled: boolean;
    };
    try {
      await prisma.artist.update({
        where: { id: Number(req.params.id) },
        data: {
          enabled,
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
      const artist = await prisma.artist.findUnique({
        where: { id: Number(id) },
        select: {
          name: true,
          enabled: true,
          createdAt: true,
          updatedAt: true,
          id: true,
          user: {
            select: {
              email: true,
              id: true,
            },
          },
        },
      });
      if (!artist) {
        return res.status(404).json({ message: "Artist not found" });
      }
      res.json({ result: artist });
    } catch (e) {
      next(e);
    }
  }

  async function DELETE(req: Request, res: Response, next: NextFunction) {
    const { id } = req.params;
    try {
      const artist = await prisma.artist.findFirst({
        where: { id: Number(id) },
        select: {
          id: true,
          userId: true,
        },
      });
      if (!artist) {
        return res.status(404).json({ message: "Artist not found" });
      }
      await deleteArtist(artist.userId, Number(id));
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
