import { User } from "@prisma/client";
import { Request, Response } from "express";

import { userAuthenticated } from "../../../../auth/passport";
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
    POST: [userAuthenticated, POST],
  };

  async function POST(req: Request, res: Response) {
    const { id: artistId } = req.params as unknown as Params;
    const { id: userId } = req.user as User;
    const { tierId } = req.body;

    try {
      const user = await prisma.user.findFirst({
        where: {
          id: userId,
        },
      });

      const client = await prisma.client.findFirst({});
      const tier = await prisma.artistSubscriptionTier.findFirst({
        where: {
          id: tierId,
        },
        include: {
          artist: true,
        },
      });

      if (!tier) {
        return res.status(404);
      }

      const productKey = await createSubscriptionStripeProduct(tier);

      if (productKey) {
        const session = await stripe.checkout.sessions.create({
          billing_address_collection: "auto",
          customer_email: user?.email,
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
            userId,
          },
          mode: "subscription",
          success_url: `${API_DOMAIN}/v1/checkout?success=true&session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${API_DOMAIN}/v1/checkout?canceled=true`,
        });

        // res.redirect(303, session.url ?? "");
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
