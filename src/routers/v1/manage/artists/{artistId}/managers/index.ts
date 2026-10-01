import prisma from "@mirlo/prisma";
import { NextFunction, Request, Response } from "express";

import { assertLoggedIn } from "../../../../../../auth/getLoggedInUser";
import {
  profileBelongsToLoggedInUser,
  profileOwnedByLoggedInUser,
  userAuthenticated,
} from "../../../../../../auth/passport";
import { findProfileIdForURLSlug } from "../../../../../../utils/artist";
import { AppError } from "../../../../../../utils/error";
import {
  findProfileManagers,
  sendProfileManagerInvite,
} from "../../../../../../utils/profileManagers";

export default function () {
  const operations = {
    GET: [userAuthenticated, profileBelongsToLoggedInUser, GET],
    POST: [userAuthenticated, profileOwnedByLoggedInUser, POST],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { artistId } = req.params as { artistId: string };
    try {
      assertLoggedIn(req);
      const profileId = Number(await findProfileIdForURLSlug(artistId));
      const profile = await prisma.profile.findFirstOrThrow({
        where: { id: profileId },
        select: { userId: true },
      });
      const showEmail = profile.userId === req.user.id || !!req.user.isAdmin;
      res.json({
        results: await findProfileManagers(profileId, { showEmail }),
      });
    } catch (e) {
      next(e);
    }
  }

  GET.apiDoc = {
    summary:
      "Returns the users who manage an artist, including pending invites. Emails are only included for the owner and admins",
    parameters: [
      { in: "path", name: "artistId", required: true, type: "string" },
    ],
    responses: {
      200: { description: "A list of managers" },
      default: {
        description: "An error occurred",
        schema: { additionalProperties: true },
      },
    },
  };

  async function POST(req: Request, res: Response, next: NextFunction) {
    const { artistId } = req.params as { artistId: string };
    const { email } = req.body as { email?: string };
    assertLoggedIn(req);
    const loggedInUser = req.user;

    try {
      if (!email?.trim()) {
        throw new AppError({
          httpCode: 400,
          description: '"email" is required',
        });
      }
      const profileId = Number(await findProfileIdForURLSlug(artistId));
      const profile = await prisma.profile.findFirstOrThrow({
        where: { id: profileId },
      });

      const invitedUser = await prisma.user.findFirst({
        where: { email: { equals: email.trim(), mode: "insensitive" } },
      });
      if (!invitedUser) {
        throw new AppError({
          httpCode: 404,
          description: "No account uses that email",
          code: "manager_invite_no_account",
        });
      }
      if (invitedUser.id === profile.userId) {
        throw new AppError({
          httpCode: 400,
          description: "That user already owns this artist",
          code: "manager_invite_is_owner",
        });
      }

      const existing = await prisma.profileManager.findUnique({
        where: {
          profileId_userId: { profileId, userId: invitedUser.id },
        },
      });
      if (existing) {
        throw new AppError({
          httpCode: 409,
          description: "That user has already been invited",
          code: "manager_invite_already_invited",
        });
      }

      await prisma.profileManager.create({
        data: {
          profileId,
          userId: invitedUser.id,
          invitedById: loggedInUser.id,
        },
      });

      await sendProfileManagerInvite(profile, invitedUser, loggedInUser);

      // Only the owner (or an admin) can invite, so they see emails.
      res.json({
        results: await findProfileManagers(profileId, { showEmail: true }),
      });
    } catch (e) {
      next(e);
    }
  }

  POST.apiDoc = {
    summary:
      "Invites an existing Mirlo user to manage an artist. Only the artist's owner can do this",
    parameters: [
      { in: "path", name: "artistId", required: true, type: "string" },
      {
        in: "body",
        name: "invite",
        required: true,
        schema: {
          type: "object",
          required: ["email"],
          properties: { email: { type: "string" } },
        },
      },
    ],
    responses: {
      200: { description: "The updated list of managers" },
      default: {
        description: "An error occurred",
        schema: { additionalProperties: true },
      },
    },
  };

  return operations;
}
