import { NextFunction, Request, Response } from "express";
import {
  userAuthenticated,
  userHasPermission,
} from "../../../../auth/passport";
import { Prisma, User } from "@mirlo/prisma/client";
import prisma from "@mirlo/prisma";
import { deleteUser, updateCurrencies } from "../../../../utils/user";
import bcrypt from "bcryptjs";
import { AppError } from "../../../../utils/error";
import sendMail from "../../../../jobs/send-mail";
import { Job } from "bullmq";

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
    const { newEmail, name, currency, language, urlSlug, isLabelAccount } =
      req.body;
    const user = req.user as User;

    if (user.id !== Number(userId)) {
      res.status(401).json({ error: "Editing invalid user" });
      return next();
    }

    try {
      let data: Prisma.UserUpdateInput = {
        name,
        currency,
        language,
        isLabelAccount,
        urlSlug,
      };

      let changedEmail = false;

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
              changedEmail = true;
            }
          } else {
            throw new AppError({
              httpCode: 401,
              description: "Can't change user email, not found",
            });
          }
        }
      }

      await prisma.user.update({
        select: {
          email: true,
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
        data: {
          ...data,
          email: newEmail,
        },
      });

      if (data.currency && typeof data.currency === "string") {
        updateCurrencies(user.id, data.currency);
      }

      const refreshedUser = await prisma.user.findFirst({
        where: {
          id: user.id,
        },
        select: {
          email: true,
          id: true,
        },
      });
      if (changedEmail && refreshedUser) {
        sendMail({
          data: {
            template: "user-changed-email",
            message: {
              to: refreshedUser.email,
            },
            locals: {
              newEmail: refreshedUser.email,
            },
          },
        } as Job);
        sendMail({
          data: {
            template: "user-changed-email",
            message: {
              to: user.email,
            },
            locals: {
              newEmail: refreshedUser.email,
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
