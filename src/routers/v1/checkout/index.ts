import { NextFunction, Request, Response } from "express";
import prisma from "../../../../prisma/prisma";

import stripe from "../../../utils/stripe";

export default function () {
  const operations = {
    GET: [GET],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { success, session_id } = req.query;
    console.log("accessing checkout");
    try {
      if (session_id && typeof session_id === "string") {
        console.log("has session");
        const session = await stripe.checkout.sessions.retrieve(session_id);
        const { clientId, artistId, trackGroupId, tierId } =
          session.metadata as unknown as {
            clientId: number | null;
            artistId: number | null;
            tierId: number | null;
            trackGroupId: number | null;
          };
        if (clientId) {
          const client = await prisma.client.findFirst({
            where: {
              id: +clientId,
            },
          });

          if (client && tierId && artistId) {
            // FIXME: We'll probably want clients to be able to define the
            // checkout callbackURL separately from the applicationURL
            // and that callbackURL should probably contain a pattern that
            // they can define
            res.redirect(
              client?.applicationUrl +
                `/${artistId}?subscribe=${
                  success ? "success" : "canceled"
                }&tierId=${tierId}`
            );
          } else if (client && trackGroupId && artistId) {
            // FIXME: We'll probably want clients to be able to define the
            // checkout callbackURL separately from the applicationURL
            // and that callbackURL should probably contain a pattern that
            // they can define
            res.redirect(
              client?.applicationUrl +
                `/${artistId}?trackGroupPurchase=${
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
          .status(500)
          .json({ error: "Something went wrong while subscribing the user" });
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
