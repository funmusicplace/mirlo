import { Artist, PrismaClient, User } from "@prisma/client";
import { NextFunction, Request, Response } from "express";
import { pick } from "lodash";
import Stripe from "stripe";
import { userAuthenticated } from "../../../../auth/passport";
import { generateCover } from "../processor";

const { STRIPE_KEY, STRIPE_PURCHASE_ALBUM_KEY, API_DOMAIN } = process.env;

const stripe = new Stripe(STRIPE_KEY ?? "", {
  apiVersion: "2022-11-15",
});

const prisma = new PrismaClient();

type Params = {
  id: string;
};

export default function () {
  const operations = {
    POST: [userAuthenticated, POST],
  };

  async function POST(req: Request, res: Response) {
    const { id: trackGroupId } = req.params as unknown as Params;
    const { id: userId } = req.user as User;

    try {
      const client = await prisma.client.findFirst({});
      const trackGroup = await prisma.trackGroup.findFirst({
        where: {
          id: Number(trackGroupId),
        },
        include: {
          artist: true,
          cover: true,
        },
      });

      if (!trackGroup) {
        return res.status(404);
      }
      const session = await stripe.checkout.sessions.create({
        billing_address_collection: "auto",
        line_items: [
          {
            price_data: {
              unit_amount: trackGroup.minPrice ?? 0,
              currency: trackGroup.currency ?? "USD",
              // FIXME: it might be a good idea to store products for
              // a trackGroup at some point.
              product_data: {
                name: `${trackGroup.title} by ${trackGroup.artist.name}`,
                description: trackGroup.about ?? "",
                images: trackGroup.cover
                  ? [generateCover(trackGroup.cover?.url[4])]
                  : [],
              },
            },

            quantity: 1,
          },
        ],
        metadata: {
          clientId: client?.id ?? null,
          trackGroupId,
          userId,
        },
        mode: "payment",
        success_url: `${API_DOMAIN}/v1/checkout?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${API_DOMAIN}/v1/checkout?canceled=true`,
      });

      // res.redirect(303, session.url ?? "");
      res.status(200).json({
        sessionUrl: session.url,
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({
        error: "Something went wrong while buying the track group",
      });
    }
  }

  POST.apiDoc = {
    summary: "Purchase a TrackGroup",
    parameters: [
      {
        in: "path",
        name: "id",
        required: true,
        type: "number",
      },
      {
        in: "body",
        name: "purchase",
        schema: {
          type: "object",
          required: [],
          properties: {
            trackGroupId: {
              type: "number",
            },
          },
        },
      },
    ],
    responses: {
      200: {
        description: "purchased artist",
      },
      default: {
        description: "An error occurred",
        schema: {
          additionalProperties: true,
        },
      },
    },
  };

  return operations;
}
