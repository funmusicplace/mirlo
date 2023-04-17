import { PrismaClient, User } from "@prisma/client";
import { Request, Response } from "express";
import Stripe from "stripe";
import { userAuthenticated } from "../../../auth/passport";
const { STRIPE_KEY } = process.env;

const stripe = new Stripe(STRIPE_KEY ?? "", {
  apiVersion: "2022-11-15",
});

const prisma = new PrismaClient();

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
