import { NextFunction, Request, Response } from "express";

import {
  profileEditableByUser,
  userAuthenticatedWithScope,
} from "../../../../auth/passport";
import { AppError } from "../../../../utils/error";
import { getPaymentProcessor } from "../../../../utils/payments/PaymentProcessor";

const findManagedIntent = async (req: Request) => {
  const { id } = req.params;
  const { stripeAccountId } = req.query as { stripeAccountId?: string };

  if (!id) {
    throw new AppError({ httpCode: 400, description: "id is required" });
  }
  if (!stripeAccountId) {
    throw new AppError({
      httpCode: 400,
      description: "stripeAccountId query param is required",
    });
  }

  const { profileId, status, error } = await getPaymentProcessor().getStatus({
    id,
    accountId: stripeAccountId,
  });

  if (!profileId) {
    throw new AppError({
      httpCode: 404,
      description: "Purchase not found",
    });
  }

  await profileEditableByUser(Number(profileId), req.user as Express.User);

  return { id, stripeAccountId, status, error };
};

const idParameters = [
  {
    in: "path",
    name: "id",
    required: true,
    type: "string",
    description: "PaymentIntent ID (pi_*) or SetupIntent ID (seti_*)",
  },
  {
    in: "query",
    name: "stripeAccountId",
    required: true,
    type: "string",
    description: "Artist's connected Stripe account ID",
  },
];

const intentStatusSchema = {
  type: "object",
  properties: {
    result: {
      type: "object",
      properties: {
        id: { type: "string" },
        status: { type: "string" },
        error: {
          type: "string",
          description:
            "Why the last attempt failed, e.g. a declined card; null otherwise",
        },
      },
    },
  },
};

export default function () {
  const operations = {
    GET: [userAuthenticatedWithScope("pos"), GET],
    DELETE: [userAuthenticatedWithScope("pos"), DELETE],
  };

  async function GET(req: Request, res: Response, next: NextFunction) {
    try {
      const { id, status, error } = await findManagedIntent(req);
      res.status(200).json({ result: { id, status, error } });
    } catch (e) {
      next(e);
    }
  }

  GET.apiDoc = {
    summary: "Poll a pending purchase",
    description:
      "The status of a PaymentIntent (pi_*) or SetupIntent (seti_*), e.g. " +
      "one dispatched to a terminal reader. A declined card leaves the " +
      "intent pending with `error` set. Accepts the signed-in session " +
      "or an OAuth token with the `pos` scope.",
    parameters: idParameters,
    responses: {
      200: { description: "Current status", schema: intentStatusSchema },
      400: { description: "Missing parameters" },
      401: { description: "Not logged in" },
      404: {
        description:
          "Purchase not found or user does not have permission to see it",
      },
      default: {
        description: "An error occurred",
        schema: { additionalProperties: true },
      },
    },
  };

  async function DELETE(req: Request, res: Response, next: NextFunction) {
    const { readerId } = req.query as { readerId?: string };

    try {
      const { id, stripeAccountId, status } = await findManagedIntent(req);

      if (status === "succeeded") {
        throw new AppError({
          httpCode: 400,
          description: "Purchase has already completed and cannot be canceled",
        });
      }

      if (status === "canceled") {
        return res.status(200).json({ result: { id, status } });
      }

      const result = await getPaymentProcessor().cancel({
        id,
        accountId: stripeAccountId,
        readerId,
      });

      res.status(200).json({ result });
    } catch (e) {
      next(e);
    }
  }

  DELETE.apiDoc = {
    summary: "Cancel a pending purchase",
    description:
      "Cancels a pending PaymentIntent (pi_*) or SetupIntent (seti_*). " +
      "Accepts the signed-in session or an OAuth token with the `pos` scope.",
    parameters: [
      ...idParameters,
      {
        in: "query",
        name: "readerId",
        required: false,
        type: "string",
        description:
          "Stripe Terminal reader ID (tmr_*) whose in-progress action for this intent should be cleared",
      },
    ],
    responses: {
      200: { description: "Purchase canceled", schema: intentStatusSchema },
      400: {
        description: "Missing parameters or purchase already completed",
      },
      401: { description: "Not logged in" },
      404: {
        description:
          "Purchase not found or user does not have permission to cancel it",
      },
      default: {
        description: "An error occurred",
        schema: { additionalProperties: true },
      },
    },
  };

  return operations;
}
