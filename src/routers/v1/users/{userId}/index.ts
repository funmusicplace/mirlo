import { randomUUID } from "crypto";

import prisma from "@mirlo/prisma";
import { Prisma } from "@mirlo/prisma/client";
import bcrypt from "bcryptjs";
import { Job } from "bullmq";
import { NextFunction, Request, Response } from "express";

import { assertLoggedIn } from "../../../../auth/getLoggedInUser";
import {
  userAuthenticated,
  userHasPermission,
} from "../../../../auth/passport";
import sendMail from "../../../../jobs/send-mail";
import { AppError } from "../../../../utils/error";
import generateSlug from "../../../../utils/generateSlug";
import { getClient } from "../../../../utils/getClient";
import { deleteUser, updateCurrencies } from "../../../../utils/user";

export default function () {
  const operations = {
    GET: [userAuthenticated, userHasPermission("owner")],
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
    const {
      newEmail,
      accountingEmail,
      name,
      properties,
      currency,
      language,
      urlSlug,
      isLabelAccount,
    } = req.body;
    assertLoggedIn(req);
    const user = req.user;

    if (user.id !== Number(userId)) {
      res.status(401).json({ error: "Editing invalid user" });
      return next();
    }

    // Can only toggle label account if user canCreateArtists
    if (isLabelAccount && !user.canCreateArtists) {
      throw new AppError({
        httpCode: 401,
        description: "User can't be changed to label account",
      });
    }

    try {
      let data: Prisma.UserUpdateInput = {
        name,
        currency,
        accountingEmail,
        language,
        isLabelAccount,
        urlSlug,
        properties,
      };

      let pendingEmailSent = false;

      if (req.user && newEmail) {
        const emailChanged = newEmail !== user.email;

        if (emailChanged) {
          const password = req.body.password;

          const foundUser = await prisma.user.findFirst({
            where: {
              email: user.email,
              emailConfirmationToken: null,
            },
          });
          if (foundUser && password && password !== "") {
            const match = await bcrypt.compare(password, foundUser.password);

            if (!match) {
              throw new AppError({
                httpCode: 401,
                description: "Can't change user email, wrong password",
              });
            } else {
              // Generate verification token for new email
              const emailChangeToken = randomUUID();
              const emailChangeExpiration = new Date(
                Date.now() + 24 * 60 * 60 * 1000 // 24 hour expiration
              );

              data.pendingEmail = newEmail;
              data.pendingEmailToken = emailChangeToken;
              data.pendingEmailExpiration = emailChangeExpiration;
              pendingEmailSent = true;
            }
          } else {
            throw new AppError({
              httpCode: 401,
              description: "Can't change user email, not found",
            });
          }
        }
      }

      const updatedUser = await prisma.user.update({
        select: {
          email: true,
          pendingEmail: true,
          name: true,
          language: true,
          emailConfirmationToken: true,
          currency: true,
          isLabelAccount: true,
          urlSlug: true,
        },
        where: {
          id: Number(userId),
        },
        data,
      });

      if (data.isLabelAccount) {
        const hasLabelProfile = await prisma.artist.findFirst({
          where: {
            userId: user.id,
            isLabelProfile: true,
            deletedAt: null,
          },
        });
        if (!hasLabelProfile) {
          await prisma.artist.create({
            data: {
              userId: user.id,
              name: updatedUser.name ?? updatedUser.email,
              isLabelProfile: true,
              // other artist fields
              urlSlug:
                updatedUser.urlSlug ??
                generateSlug(updatedUser.name ?? updatedUser.email),
            },
          });
        }
      }

      if (data.currency && typeof data.currency === "string") {
        await updateCurrencies(user.id, data.currency);
      }

      const refreshedUser = await prisma.user.findFirst({
        where: {
          id: user.id,
        },
        select: {
          email: true,
          pendingEmail: true,
          id: true,
        },
      });

      if (pendingEmailSent && refreshedUser?.pendingEmail) {
        const client = await getClient();
        sendMail({
          data: {
            template: "confirm-email-change",
            message: {
              to: refreshedUser.pendingEmail,
            },
            locals: {
              userId: user.id,
              newEmail: refreshedUser.pendingEmail,
              token: data.pendingEmailToken,
              clientDomain: client.applicationUrl,
              host: process.env.API_DOMAIN,
            },
          },
        } as Job);
      }
      res.json({ result: refreshedUser });
    } catch (e) {
      next(e);
    }
  }

  async function DELETE(req: Request, res: Response, next: NextFunction) {
    assertLoggedIn(req);
    const user = req.user;
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
