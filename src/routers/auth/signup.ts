import { NextFunction, Request, Response } from "express";
import prisma from "@mirlo/prisma";
import { hashPassword } from ".";
import { sendMail } from "../../jobs/send-mail";
import { Job } from "bullmq";

const signup = async (req: Request, res: Response, next: NextFunction) => {
  let {
    name,
    email,
    password,
    client: clientURL,
    receiveMailingList,
    accountType,
  } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: "Email and password must be supplied" });
    return next();
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
        res
          .status(400)
          .json({ error: "A user with this email already exists" });
      } else {
        res.status(400).json({ error: "User account incomplete" });
      }
    } else {
      const result = await prisma.user.create({
        data: {
          name,
          email,
          receiveMailingList: !!receiveMailingList,
          password: await hashPassword(password),
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

      res.json(result);
    }
  } catch (e) {
    next(e);
  }
};

export default signup;
