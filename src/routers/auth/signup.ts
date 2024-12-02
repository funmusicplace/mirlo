import { NextFunction, Request, Response } from "express";
import prisma from "@mirlo/prisma";
import { hashPassword } from ".";
import { sendMail } from "../../jobs/send-mail";
import { Job } from "bullmq";
import logger from "../../logger";
import { AppError } from "../../utils/error";

const signup = async (req: Request, res: Response, next: NextFunction) => {
  let {
    name,
    email,
    password,
    client: clientURL,
    receiveMailingList,
    accountType,
    promoCode,
  } = req.body;

  if (!email || !password) {
    next(
      new AppError({
        httpCode: 400,
        description: "Email and password must be supplied",
      })
    );
  }
  try {
    email = email.toLowerCase();

    const existing = await prisma.user.findFirst({
      where: {
        email,
      },
    });
    const client = await prisma.client.findFirst({
      where: {
        applicationUrl: clientURL,
      },
    });

    if (!client) {
      res.status(400).json({ error: "This client does not exist " });
    } else if (existing) {
      if (existing.password) {
        logger.info(`auth/signup: attempt to signup with completed account`);
        return next(
          new AppError({
            httpCode: 400,
            description: "A user with this email already exists",
          })
        );
      } else {
        logger.info(`auth/signup: attempt to signup with incomplete account`);
        return next(
          new AppError({
            httpCode: 400,
            description: "User account incomplete",
          })
        );
      }
    } else {
      const result = await prisma.user.create({
        data: {
          name,
          email,
          receiveMailingList: !!receiveMailingList,
          password: await hashPassword(password),
          promoCodes: promoCode ? [promoCode] : [],
        },
        select: {
          name: true,
          email: true,
          id: true,
          receiveMailingList,
          emailConfirmationToken: true,
        },
      });

      await sendMail({
        data: {
          template: "new-user",
          message: {
            to: result.email,
          },
          locals: {
            accountType,
            user: result,
            host: process.env.API_DOMAIN,
            client: client.id,
          },
        },
      } as Job);

      return res.json(result);
    }
  } catch (e) {
    next(e);
  }
};

export default signup;
