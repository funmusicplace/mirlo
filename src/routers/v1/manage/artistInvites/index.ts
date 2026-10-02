import prisma from "@mirlo/prisma";
import { NextFunction, Request, Response } from "express";

import { assertLoggedIn } from "../../../../auth/getLoggedInUser";
import { userAuthenticated } from "../../../../auth/passport";
import { serializeArtistInvite } from "../../../../serializers/profileManager";

export default function () {
  const operations = {
    GET: [userAuthenticated, GET],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    assertLoggedIn(req);
    const loggedInUser = req.user;
    try {
      const invites = await prisma.profileManager.findMany({
        where: {
          userId: loggedInUser.id,
          acceptedAt: null,
          profile: { deletedAt: null },
        },
        include: {
          profile: {
            select: { id: true, name: true, urlSlug: true, avatar: true },
          },
          invitedBy: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      });
      res.json({ results: invites.map(serializeArtistInvite) });
    } catch (e) {
      next(e);
    }
  }

  GET.apiDoc = {
    summary:
      "Returns pending invites for the logged in user to manage an artist",
    responses: {
      200: { description: "A list of pending invites" },
      default: {
        description: "An error occurred",
        schema: { additionalProperties: true },
      },
    },
  };

  return operations;
}
