import { NextFunction, Request, Response } from "express";
import Stripe from "stripe";

import { userAuthenticated, userHasPermission } from "../../../auth/passport";
import { AppError } from "../../../utils/error";
import { registerStripeConnectWebhook } from "../../../utils/stripe/webhooks";

export default function () {
  const operations = {
    POST: [userAuthenticated, userHasPermission("admin"), POST],
  };

  async function POST(req: Request, res: Response, next: NextFunction) {
    try {
      const { webhookEndpointId, webhookConnectSigningSecret } =
        await registerStripeConnectWebhook(
          process.env.API_DOMAIN ?? "http://localhost:3000"
        );
      return res
        .status(200)
        .json({ result: { webhookEndpointId, webhookConnectSigningSecret } });
    } catch (e) {
      // e.g. an unreachable URL or a missing key: show the admin Stripe's reason
      if (e instanceof Stripe.errors.StripeError) {
        return next(new AppError({ httpCode: 400, description: e.message }));
      }
      next(e);
    }
  }

  POST.apiDoc = {
    summary:
      "Registers this instance's Connect webhook endpoint with Stripe and saves its signing secret",
    responses: {
      200: { description: "The new endpoint id and signing secret" },
      409: { description: "A webhook is already registered" },
    },
  };

  return operations;
}
