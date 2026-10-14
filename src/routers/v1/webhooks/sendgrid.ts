import { EventWebhook, EventWebhookHeader } from "@sendgrid/eventwebhook";
import { Request, Response } from "express";

import { recordBouncedRecipients } from "../../../jobs/send-mail";
import logger from "../../../logger";
import { getSiteSettings } from "../../../utils/settings";

type SendgridEvent = {
  event?: string;
  type?: string;
  email?: string;
  reason?: string;
};

const DEAD_ADDRESS_DROP_REASONS = ["Bounced Address", "Invalid"];

const MAX_TIMESTAMP_AGE_SECONDS = 5 * 60;

const isDeadAddress = (event: SendgridEvent) =>
  (event.event === "bounce" && event.type === "bounce") ||
  (event.event === "dropped" &&
    DEAD_ADDRESS_DROP_REASONS.includes(event.reason ?? ""));

const isSignatureValid = (req: Request, publicKey: string) => {
  const signature = req.get(EventWebhookHeader.SIGNATURE());
  const timestamp = req.get(EventWebhookHeader.TIMESTAMP());
  const rawBody = (req as Request & { rawBody?: string }).rawBody;
  if (!signature || !timestamp || !rawBody) {
    return false;
  }
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!(age <= MAX_TIMESTAMP_AGE_SECONDS)) {
    return false;
  }
  try {
    const eventWebhook = new EventWebhook();
    return eventWebhook.verifySignature(
      eventWebhook.convertPublicKeyToECDSA(publicKey),
      rawBody,
      signature,
      timestamp
    );
  } catch {
    return false;
  }
};

export default function () {
  const operations = {
    POST,
  };

  async function POST(req: Request, res: Response) {
    const log = req.logger ?? logger;
    const settings = await getSiteSettings();
    const publicKey =
      settings.settings?.emailProvider?.sendgrid?.webhookPublicKey?.trim() ||
      process.env.SENDGRID_WEBHOOK_PUBLIC_KEY?.trim();

    if (!publicKey) {
      log.warn("sendgrid-webhook: no verification key configured");
      return res.status(401).send();
    }
    if (!isSignatureValid(req, publicKey)) {
      log.warn("sendgrid-webhook: invalid signature");
      return res.status(401).send();
    }
    if (!Array.isArray(req.body)) {
      return res.status(400).send();
    }

    const bounces = (req.body as SendgridEvent[])
      .filter(isDeadAddress)
      .filter((event) => event.email)
      .map((event) => ({
        email: event.email as string,
        reason: event.reason ?? event.event ?? "bounce",
      }));

    if (bounces.length) {
      log.info(`sendgrid-webhook: recording ${bounces.length} bounce(s)`);
      await recordBouncedRecipients(bounces);
    }

    res.send();
  }

  POST.apiDoc = {
    summary: "Receives SendGrid Event Webhook events to record bounces",
    responses: {
      200: {
        description: "Events received",
      },
      401: {
        description: "Missing or invalid signature",
      },
    },
  };

  return operations;
}
