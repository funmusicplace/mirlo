import Stripe from "stripe";
import prisma from "../../prisma/prisma";
import { Prisma } from "@prisma/client";

const { STRIPE_KEY } = process.env;

const stripe = new Stripe(STRIPE_KEY ?? "", {
  apiVersion: "2022-11-15",
});

export const createSubscriptionStripeProduct = async (
  tier: Prisma.ArtistSubscriptionTierGetPayload<{ include: { artist: true } }>
) => {
  let productKey = tier.stripeProductKey;
  if (productKey) {
    try {
      const product = await stripe.products.retrieve(productKey);
    } catch (e) {
      if (e instanceof Error) {
        if (e.message.includes("No such product")) {
          console.error("Weird, product doesn't exist", e.message);
          productKey = null;
        }
      }
    }
  }

  if (!productKey) {
    const product = await stripe.products.create({
      name: `Supporting ${tier.artist.name} at ${tier.name}`,
      description: tier.description ?? "Thank you for your support!",
    });
    await prisma.artistSubscriptionTier.update({
      where: {
        id: Number(tier.id),
      },
      data: {
        stripeProductKey: product.id,
      },
    });
    productKey = product.id;
  }
  return productKey;
};

export default stripe;
