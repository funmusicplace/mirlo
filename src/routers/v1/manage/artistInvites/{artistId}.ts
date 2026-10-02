import prisma from "@mirlo/prisma";
import { NextFunction, Request, Response } from "express";

import { assertLoggedIn } from "../../../../auth/getLoggedInUser";
import { userAuthenticated } from "../../../../auth/passport";
import { AppError } from "../../../../utils/error";

export default function () {
  const operations = {
    PUT: [userAuthenticated, PUT],
    DELETE: [userAuthenticated, DELETE],
  };

  async function PUT(req: Request, res: Response, next: NextFunction) {
    const { artistId } = req.params as { artistId: string };
    assertLoggedIn(req);
    const loggedInUser = req.user;
    try {
      const { count } = await prisma.profileManager.updateMany({
        where: {
          profileId: Number(artistId),
          userId: loggedInUser.id,
          acceptedAt: null,
        },
        data: { acceptedAt: new Date() },
      });
      if (!count) {
        throw new AppError({ httpCode: 404, description: "Invite not found" });
      }
      res.json({ message: "Success" });
    } catch (e) {
      next(e);
    }
  }

  PUT.apiDoc = {
    summary: "Accepts an invite to manage an artist",
    parameters: [
      { in: "path", name: "artistId", required: true, type: "number" },
    ],
    responses: {
      200: { description: "Invite accepted" },
      default: {
        description: "An error occurred",
        schema: { additionalProperties: true },
      },
    },
  };

  async function DELETE(req: Request, res: Response, next: NextFunction) {
    const { artistId } = req.params as { artistId: string };
    assertLoggedIn(req);
    const loggedInUser = req.user;
    try {
      await prisma.profileManager.deleteMany({
        where: { profileId: Number(artistId), userId: loggedInUser.id },
      });
      res.json({ message: "Success" });
    } catch (e) {
      next(e);
    }
  }

  DELETE.apiDoc = {
    summary:
      "Declines an invite to manage an artist, or gives up manage access already accepted",
    parameters: [
      { in: "path", name: "artistId", required: true, type: "number" },
    ],
    responses: {
      200: { description: "Invite declined or access removed" },
      default: {
        description: "An error occurred",
        schema: { additionalProperties: true },
      },
    },
  };

  return operations;
}
