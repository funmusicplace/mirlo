import { Request, Response } from "express";
import Stripe from "stripe";

import logger from "../../../../logger";
import {
  getStripeWebhookConnectSigningSecret,
  verifyStripeSignature,
} from "../../../../utils/stripe";
import { stripeConnectEventHandlers } from "../../../../utils/stripe/webhooks";

// NOTE: if you are running Mirlo locally, the only way to get these
// webhooks to be triggered is by running the stripe CLI. See the README
// for details.

// NOTE 2: This is the endpoint that handles the stripe webhook events for
// _connected_ stripe accounts.

// NOTE 3: Events are handled in stripeConnectEventHandlers
// (src/utils/stripe/webhooks.ts), which also decides what the endpoint
// subscribes to.

export default function () {
  const operations = {
    POST,
  };

  async function POST(req: Request, res: Response, next: Function) {
    const log = req.logger ?? logger;
    log.info("stripe-connect: receiving user account webhook");
    const event = await verifyStripeSignature(
      req,
      res,
      getStripeWebhookConnectSigningSecret()
    );
    log.info(`stripe-connect: event for stripe account ${event.account}`);

    try {
      const handler =
        stripeConnectEventHandlers[
          event.type as keyof typeof stripeConnectEventHandlers
        ];
      if (handler) {
        await (handler as (e: Stripe.Event, l: typeof log) => unknown)(
          event,
          log
        );
      } else {
        // Unexpected event type
        log.info(`stripe-connect: unhandled Stripe event type ${event.type}.`);
      }
      // Return a 200 response to acknowledge receipt of the event
      res.send();
    } catch (err) {
      log.error("stripe-connect: error in webhook handler", err);
      next(err);
    }
  }

  return operations;
}
