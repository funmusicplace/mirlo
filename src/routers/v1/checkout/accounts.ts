import { User } from "@prisma/client";
import { Request, Response } from "express";
import { userAuthenticated } from "../../../auth/passport";
import prisma from "../../../../prisma/prisma";

import stripe from "../../../utils/stripe";

type Params = {
  userId: string;
};

export default function () {
  const operations = {
    POST: [userAuthenticated, POST],
  };

  async function POST(req: Request, res: Response) {
    const { userId } = req.body as unknown as Params;
    const loggedInUser = req.user as User;
    if (Number(userId) === Number(loggedInUser.id)) {
      const user = await prisma.user.findUnique({
        where: { id: Number(userId) },
      });
      if (user) {
        const account = await stripe.accounts.create({
          // country: "US", // FIXME: we need to register users country
          // type: "express",
          // business_profile: { name: user?.name },
        });
      }
      res.json({});
    } else {
      res.status(401);
      res.json({
        error: "Invalid route",
      });
    }
  }

  return operations;
}
