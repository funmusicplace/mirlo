import { NextFunction, Request, Response } from "express";
import prisma from "@mirlo/prisma";

import stripe from "../../../utils/stripe";

export default function () {
  const operations = {
    GET: [GET],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { session_id, stripeAccountId } = req.query;
    try {
      if (
        typeof session_id === "string" &&
        typeof stripeAccountId === "string"
      ) {
        const session = await stripe.checkout.sessions.retrieve(session_id, {
          stripeAccount: stripeAccountId,
        });

        res.send({
          status: session.status,
          customer_email: session.customer_details?.email,
        });
      } else {
        res
          .status(400)
          .json({ error: "need session_id and stripeAccountId in query" });
      }
    } catch (e) {
      console.error(`Error in checkout process`, e);
      res.status(500).json({
        error: "Something went wrong while subscribing the user",
      });
    }
  }

  return operations;
}
