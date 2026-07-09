import prisma from "@mirlo/prisma";
import { NextFunction, Request, Response } from "express";

import {
  buildCheckoutRedirectUrl,
  normaliseBaseUrl,
} from "../../../utils/clientUrl";
import stripe from "../../../utils/stripe";

const parseNumericQueryParam = (value: unknown) => {
  if (typeof value !== "string") {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
};

export default function () {
  const operations = {
    GET: [GET],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    const { success, canceled, session_id, stripeAccountId } = req.query;
    try {
      if (canceled) {
        const clientId = parseNumericQueryParam(req.query.clientId);
        const artistId = parseNumericQueryParam(req.query.artistId);

        const client = clientId
          ? await prisma.client.findUnique({ where: { id: clientId } })
          : null;
        const artist = artistId
          ? await prisma.profile.findUnique({ where: { id: artistId } })
          : null;

        const checkoutPath = artist?.urlSlug
          ? `${artist.urlSlug}/checkout-error`
          : "checkout-error";

        const reasonParam =
          typeof req.query.reason === "string" && req.query.reason
            ? req.query.reason
            : "user_canceled";

        const searchParams = new URLSearchParams();
        searchParams.set("reason", reasonParam);

        res.redirect(
          buildCheckoutRedirectUrl(
            client?.applicationUrl ?? null,
            checkoutPath,
            searchParams
          )
        );
        return;
      }

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
          const client = await prisma.client.findUnique({
            where: { id: +clientId },
          });
          const artist = await prisma.profile.findUnique({
            where: { id: +artistId },
          });

          const searchParams = new URLSearchParams();
          searchParams.set("purchaseType", purchaseType ?? "");
          trackGroupId &&
            searchParams.set("trackGroupId", trackGroupId.toString());
          trackId && searchParams.set("trackId", trackId.toString());
          tierId && searchParams.set("tierId", tierId.toString());
          merchId && searchParams.set("merchId", merchId);
          tipId && searchParams.set("tipId", tipId);

          if (artist?.urlSlug) {
            res.redirect(
              buildCheckoutRedirectUrl(
                client?.applicationUrl ?? null,
                `${artist.urlSlug}/checkout-complete`,
                searchParams
              )
            );
          } else {
            res.redirect(normaliseBaseUrl(client?.applicationUrl ?? null));
          }
        } else {
          res.redirect(normaliseBaseUrl());
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
