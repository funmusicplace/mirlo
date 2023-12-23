import { User } from "@prisma/client";
import { Request, Response } from "express";

import { userLoggedInWithoutRedirect } from "../../../../auth/passport";
import prisma from "../../../../../prisma/prisma";

const { API_DOMAIN } = process.env;

import stripe, {
  createSubscriptionStripeProduct,
} from "../../../../utils/stripe";

type Params = {
  id: string;
};

export default function () {
  const operations = {
    POST: [userLoggedInWithoutRedirect, POST],
  };

  async function POST(req: Request, res: Response) {
    const { id: artistId } = req.params as unknown as Params;
    let { tierId, email } = req.body;

    const loggedInUser = req.user as User | undefined;

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

      const tier = await prisma.artistSubscriptionTier.findFirst({
        where: {
          id: tierId,
        },
        include: {
          artist: {
            include: {
              user: true,
            },
          },
        },
      });

      if (!tier) {
        return res.status(404);
      }
      const stripeAccountId = tier.artist.user.stripeAccountId;

      if (!stripeAccountId) {
        return res.status(400).json({
          error: "Artist not set up with a payment processor yet",
        });
      }

      const productKey = await createSubscriptionStripeProduct(
        tier,
        stripeAccountId
      );

      if (productKey) {
        const session = await stripe.checkout.sessions.create(
          {
            billing_address_collection: "auto",
            customer_email: loggedInUser?.email ?? email,
            subscription_data: {
              application_fee_percent: tier.platformPercent ?? 0 / 100,
            },
            line_items: [
              {
                price_data: {
                  tax_behavior: "exclusive",
                  unit_amount: tier.minAmount ?? 0,
                  currency: tier.currency ?? "USD",
                  product: productKey,
                  recurring: { interval: "month" },
                },
                quantity: 1,
              },
            ],
            metadata: {
              clientId: client?.id ?? null,
              artistId,
              tierId,
              userId: loggedInUser?.id ?? null,
              userEmail: email ?? null,
              stripeAccountId,
            },
            mode: "subscription",
            success_url: `${API_DOMAIN}/v1/checkout?success=true&stripeAccountId=${stripeAccountId}&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${API_DOMAIN}/v1/checkout?canceled=true`,
          },
          {
            stripeAccount: stripeAccountId,
          }
        );

        res.status(200).json({
          sessionUrl: session.url,
        });
      } else {
        res.status(500).json({
          error: "Something went wrong while subscribing the user",
        });
      }
    } catch (e) {
      console.error(e);
      res.status(500).json({
        error: "Something went wrong while subscribing the user",
      });
    }
  }

  POST.apiDoc = {
    summary: "Subscribes a user to an artist",
    parameters: [
      {
        in: "path",
        name: "id",
        required: true,
        type: "number",
      },
      {
        in: "body",
        name: "subscribe",
        schema: {
          type: "object",
          required: ["tierId"],
          properties: {
            tierId: {
              type: "number",
            },
          },
        },
      },
    ],
    responses: {
      200: {
        description: "Created artistSubscriptionTier",
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
