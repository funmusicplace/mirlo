import { User } from "@prisma/client";
import { Request, Response } from "express";
import {
  userAuthenticated,
  userLoggedInWithoutRedirect,
} from "../../../../auth/passport";
import { generateFullStaticImageUrl } from "../../../../utils/images";
import prisma from "../../../../../prisma/prisma";
import { finalCoversBucket } from "../../../../utils/minio";

const { API_DOMAIN } = process.env;

import stripe from "../../../../utils/stripe";
import { subscribeUserToArtist } from "../../../../utils/artist";

type Params = {
  id: string;
};

export default function () {
  const operations = {
    POST: [userLoggedInWithoutRedirect, POST],
  };

  async function POST(req: Request, res: Response) {
    const { id: trackGroupId } = req.params as unknown as Params;
    let { price, email } = req.body as unknown as {
      price?: string; // In cents
      email?: string;
    };
    const loggedInUser = req.user as User;

    try {
      const client = await prisma.client.findFirst({});

      if (loggedInUser) {
        const { id: userId } = loggedInUser;
        const user = await prisma.user.findFirst({
          where: {
            id: userId,
          },
        });
        email = user?.email;
      }

      const trackGroup = await prisma.trackGroup.findFirst({
        where: {
          id: Number(trackGroupId),
        },
        include: {
          artist: {
            include: {
              user: true,
              subscriptionTiers: true,
            },
          },
          cover: true,
        },
      });

      if (!trackGroup) {
        return res.status(404);
      }

      if (loggedInUser) {
        await subscribeUserToArtist(trackGroup?.artist, loggedInUser);
      }

      const stripeAccountId = trackGroup.artist.user.stripeAccountId;

      if (!stripeAccountId) {
        return res.status(400).json({
          error: "Artist not set up with a payment processor yet",
        });
      }

      let productKey = trackGroup.stripeProductKey;

      if (!trackGroup.stripeProductKey) {
        const product = await stripe.products.create(
          {
            name: `${trackGroup.title} by ${trackGroup.artist.name}`,
            description:
              trackGroup.about && trackGroup.about !== ""
                ? trackGroup.about
                : `The album ${trackGroup.title} by ${trackGroup.artist.name}.`,
            tax_code: "txcd_10401100",
            images: trackGroup.cover
              ? [
                  generateFullStaticImageUrl(
                    trackGroup.cover?.url[4],
                    finalCoversBucket
                  ),
                ]
              : [],
          },
          {
            stripeAccount: stripeAccountId,
          }
        );
        await prisma.trackGroup.update({
          where: {
            id: Number(trackGroupId),
          },
          data: {
            stripeProductKey: product.id,
          },
        });
        productKey = product.id;
      }

      if (productKey && stripeAccountId) {
        const session = await stripe.checkout.sessions.create(
          {
            billing_address_collection: "auto",
            customer_email: loggedInUser?.email ?? email,
            line_items: [
              {
                price_data: {
                  tax_behavior: "exclusive",
                  unit_amount:
                    (price ? Number(price) : undefined) ??
                    trackGroup.minPrice ??
                    0,
                  currency: trackGroup.currency ?? "USD",
                  product: productKey,
                },

                quantity: 1,
              },
            ],

            metadata: {
              clientId: client?.id ?? null,
              trackGroupId,
              artistId: trackGroup.artistId,
              userId: loggedInUser?.id,
              userEmail: email ?? null,
              stripeAccountId,
            },
            mode: "payment",
            success_url: `${API_DOMAIN}/v1/checkout?success=true&stripeAccountId=${stripeAccountId}&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${API_DOMAIN}/v1/checkout?canceled=true`,
          },
          { stripeAccount: stripeAccountId }
        );
        res.status(200).json({
          sessionUrl: session.url,
        });
      } else {
        res.status(500).json({
          error: "Something went wrong while buying the track group",
        });
      }
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
