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
          tierId,
          gaveGift,
          merchId,
          tipId,
        } = session.metadata as unknown as {
          clientId: number | null;
          artistId: number | null;
          gaveGift: 1 | null;
          tierId: number | null;
          trackGroupId: number | null;
          merchId: string | null;
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

          if (merchId && artist) {
            // FIXME: We'll probably want clients to be able to define the
            // checkout callbackURL separately from the applicationURL
            // and that callbackURL should probably contain a pattern that
            // they can define
            res.redirect(
              client?.applicationUrl +
                `/${artist?.urlSlug}/merch/${merchId}/checkout-complete`
            );
          } else if (gaveGift && artist && client) {
            // FIXME: We'll probably want clients to be able to define the
            // checkout callbackURL separately from the applicationURL
            // and that callbackURL should probably contain a pattern that
            // they can define
            res.redirect(
              client?.applicationUrl +
                `/${artist?.urlSlug}?tip=${success ? "success" : "canceled"}`
            );
          } else if (tipId && artist) {
            // FIXME: We'll probably want clients to be able to define the
            // checkout callbackURL separately from the applicationURL
            // and that callbackURL should probably contain a pattern that
            // they can define
            res.redirect(
              client?.applicationUrl +
                `/${artist.urlSlug}/tips/${tipId}/checkout-complete`
            );
          } else if (client && trackGroupId && artistId) {
            // FIXME: We'll probably want clients to be able to define the
            // checkout callbackURL separately from the applicationURL
            // and that callbackURL should probably contain a pattern that
            // they can define
            res.redirect(
              client?.applicationUrl +
                `/${artist?.urlSlug}?trackGroupPurchase=${
                  success ? "success" : "canceled"
                }&trackGroupId=${trackGroupId}`
            );
          } else {
            res.status(500).json({
              error: "Something went wrong while completing a checkout",
            });
          }
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
      console.error(e);
      res.status(500).json({
        error: "Something went wrong while subscribing the user",
      });
    }
  }

  return operations;
}
