import Stripe from "stripe";

const { STRIPE_KEY, API_DOMAIN } = process.env;

const stripe = new Stripe(STRIPE_KEY ?? "", {
  apiVersion: "2022-11-15",
});

export default stripe;
