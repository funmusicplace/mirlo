import { Request, Response } from "express";
import {
  handleCheckoutSession,
  verifyStripeSignature,
} from "../../../../utils/stripe";
import logger from "../../../../logger";

const { STRIPE_WEBHOOK_SIGNING_SECRET } = process.env;

// NOTE: if you are running Mirlo locally, the only way to get these
// webhooks to be triggered is by running the stripe CLI. See the README
// for details.

export default function () {
  const operations = {
    POST,
  };
  // Is this endpoint still used at all? Most everything gets routed by the connect webhook
  async function POST(req: Request, res: Response) {
    logger.info("stripe-index: receiving global account webhook");
    const event = await verifyStripeSignature(
      req,
      res,
      STRIPE_WEBHOOK_SIGNING_SECRET
    );

    // Handle the event
    switch (event.type) {
      case "checkout.session.completed":
        // To trigger this event type use
        // stripe trigger checkout.session.completed --add checkout_session:metadata.userId=3 --add checkout_session:metadata.tierId=2
        const session = event.data.object;
        logger.info(`stripe-index: checkout status is ${session.status}.`);

        handleCheckoutSession(session);
        break;
      default:
        // Unexpected event type
        logger.info(`stripe-index: unhandled Stripe event type ${event.type}.`);
    }
    // Return a 200 response to acknowledge receipt of the event
    res.send();
  }

  return operations;
}
