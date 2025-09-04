import { Request, Response } from "express";
import {
  handleAccountUpdate,
  handleCheckoutSession,
  handleInvoicePaid,
  handleSetupIntentSucceeded,
  verifyStripeSignature,
} from "../../../../utils/stripe";
import logger from "../../../../logger";

const { STRIPE_WEBHOOK_CONNECT_SIGNING_SECRET } = process.env;

// NOTE: if you are running Mirlo locally, the only way to get these
// webhooks to be triggered is by running the stripe CLI. See the README
// for details.

// NOTE 2: This is the endpoint that handles the stripe webhook events for
// _connected_ stripe accounts.

export default function () {
  const operations = {
    POST,
  };

  async function POST(req: Request, res: Response) {
    logger.info("stripe-connect: receiving user account webhook");
    const event = await verifyStripeSignature(
      req,
      res,
      STRIPE_WEBHOOK_CONNECT_SIGNING_SECRET
    );
    logger.info(`stripe-connect: event for stripe account ${event.account}`);

    // Handle the event
    switch (event.type) {
      case "checkout.session.completed":
        // To trigger this event type use
        // `stripe trigger checkout.session.completed --add checkout_session:metadata.userId=3 --add checkout_session:metadata.tierId=2`
        const session = event.data.object;
        logger.info(`stripe-connect: checkout status is ${session.status}.`);

        handleCheckoutSession(session);
        break;
      case "setup_intent.succeeded":
        // To trigger this event type use
        // `stripe trigger setup_intent.succeeded --add setup_intent:metadata.userId=3`
        const setupIntent = event.data.object;
        logger.info(
          `stripe-connect: setup intent status is ${setupIntent.status}.`
        );

        handleSetupIntentSucceeded(setupIntent);
        break;
      case "invoice.paid":
        const invoice = event.data.object;

        handleInvoicePaid(invoice);
        break;
      case "account.updated":
        const accountUpdate = event.data.object;

        handleAccountUpdate(accountUpdate);
        break;
      default:
        // Unexpected event type
        logger.info(
          `stripe-connect: unhandled Stripe event type ${event.type}.`
        );
    }
    // Return a 200 response to acknowledge receipt of the event
    res.send();
  }

  return operations;
}
