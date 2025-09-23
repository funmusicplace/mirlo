import { NextFunction, Request, Response } from "express";
import prisma from "@mirlo/prisma";
import { hashPassword, setTokens } from "./utils";
import { sendMail } from "../../jobs/send-mail";
import { Job } from "bullmq";
import logger from "../../logger";

import { randomUUID } from "crypto";

/**
 * This endpoint is pretty much only ever accessed from an external link,
 * so it should redirect to the client.
 * @param req
 * @param res
 * @param next
 * @returns
 */
export const passwordResetConfirmation = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    let { token } = req.params as {
      token: string;
    };
    let { id, redirectClient, accountIncomplete } = req.query as {
      redirectClient: string;
      id: string;
      accountIncomplete?: string;
    };

    const user = await prisma.user.findFirst({
      where: {
        id: Number(id),
        passwordResetConfirmationToken: token,
      },
    });

    if (!user) {
      return res.redirect(
        redirectClient +
          `?error=${encodeURIComponent("We couldn't find that user with the given details.")}`
      );
    } else if (
      user.passwordResetConfirmationExpiration &&
      user.passwordResetConfirmationExpiration < new Date()
    ) {
      return res.redirect(
        redirectClient + `?error=${encodeURIComponent("Token expired")}`
      );
    } else {
      return res.redirect(
        redirectClient +
          `?token=${token}&id=${id}&accountIncomplete=${accountIncomplete}`
      );
    }
  } catch (e) {
    logger.info(`Error with password reset ${e}`);
  }
};

export const passwordResetInitiate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // FIXME: should the client be changed from a URL to an id. Probably
    // And then check that the client exists in the DB.
    let { redirectClient, email, accountIncomplete } = req.body as {
      redirectClient: string;
      email: string;
      accountIncomplete: boolean;
    };
    email = email.toLowerCase();

    const user = await prisma.user.findFirst({
      where: {
        email,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "This user does not exist" });
    } else {
      const expirationDate = new Date();
      expirationDate.setMinutes(new Date().getMinutes() + 30);
      const token = randomUUID();
      const result = await prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          passwordResetConfirmationToken: token,
          passwordResetConfirmationExpiration: expirationDate,
        },
        select: {
          email: true,
          passwordResetConfirmationToken: true,
          id: true,
        },
      });
      await sendMail({
        data: {
          template: "password-reset",
          message: {
            to: user.email,
          },
          locals: {
            user: result,
            host: process.env.API_DOMAIN,
            redirectClient,
            accountIncomplete,
            token,
          },
        },
      } as Job);

      return res.status(200).send({ message: "Success" });
    }
  } catch (e) {
    console.error(e);
    res.status(500);
  }
};

export const passwordResetSetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // FIXME: should the client be changed from a URL to an id. Probably
    // And then check that the client exists in the DB.
    let {
      password: newPassword,
      token,
      id,
    } = req.body as {
      password: string;
      id: string;
      token: string;
    };

    const user = await prisma.user.findFirst({
      where: {
        id: Number(id),
        passwordResetConfirmationToken: token,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "This user does not exist" });
    } else if (
      user.passwordResetConfirmationExpiration &&
      user.passwordResetConfirmationExpiration < new Date()
    ) {
      return res.status(404).json({ error: "Token expired" });
    } else {
      const updatedUser = await prisma.user.update({
        data: {
          passwordResetConfirmationToken: null,
          passwordResetConfirmationExpiration: null,
          emailConfirmationExpiration: null, // At this point we've validated that the user has an e-mail address
          emailConfirmationToken: null,
          password: await hashPassword(newPassword),
        },
        where: {
          id: user.id,
        },
        select: {
          email: true,
          id: true,
        },
      });
      setTokens(res, updatedUser);
      res.status(200).json({
        message: "Success",
      });
    }
  } catch (e) {
    next(e);
  }
};
