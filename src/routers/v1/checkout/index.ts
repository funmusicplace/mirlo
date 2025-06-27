import { NextFunction, Request, Response } from "express";
import prisma from "@mirlo/prisma";

import stripe from "../../../utils/stripe";

export default function () {
  const operations = {
    GET: [GET],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { success, session_id, stripeAccountId } = req.query;
    try {
      if (
        typeof session_id === "string" &&
        typeof stripeAccountId === "string"
      ) {
        const session = await stripe.checkout.sessions.retrieve(session_id, {
          stripeAccount: stripeAccountId,
        });
        const {
          clientId,
          artistId,
          trackGroupId,
          trackId,
          tierId,
          merchId,
          purchaseType,
          tipId,
        } = session.metadata as unknown as {
          clientId: number | null;
          artistId: number | null;
          tierId: number | null;
          trackGroupId: number | null;
          trackId: number | null;
          merchId: string | null;
          purchaseType: string | null;
          tipId: string | null;
        };
        if (clientId && artistId) {
          const client = await prisma.client.findFirst({
            where: {
              id: +clientId,
            },
          });

          const artist = await prisma.artist.findFirst({
            where: { id: +artistId },
          });

          const searchParams = new URLSearchParams();
          searchParams.set("purchaseType", purchaseType ?? "");
          searchParams.set("trackGroupId", trackGroupId?.toString() ?? "");
          searchParams.set("trackId", trackId?.toString() ?? "");
          searchParams.set("tierId", tierId?.toString() ?? "");
          searchParams.set("merchId", merchId ?? "");
          searchParams.set("tipId", tipId ?? "");

          res.redirect(
            client?.applicationUrl +
              `/${artist?.urlSlug}/checkout-complete?${searchParams.toString()}`
          );
        } else {
          res.redirect(
            process.env.REACT_APP_CLIENT_DOMAIN ?? "https://mirlo.space"
          );
        }
      } else {
        res
          .status(400)
          .json({ error: "need session_id and stripeAccountId in query" });
      }
    } catch (e) {
      console.error(`Error in checkout process`, e);
      res.status(500).json({
        error: "Something went wrong while completing a checkout",
      });
    }
  }

  return operations;
}
