import { FulfillmentStatus } from "@mirlo/prisma/client";

import { sendMailQueue } from "../queues/send-mail-queue";

import { getClient } from "./getClient";

type ShipmentFields = {
  fulfillmentStatus: FulfillmentStatus;
  trackingNumber: string | null;
  trackingWebsite: string | null;
};

export const fulfillmentStatusLabels: Record<FulfillmentStatus, string> = {
  NO_PROGRESS: "Not started yet",
  STARTED: "Being prepared",
  SHIPPED: "Shipped",
  COMPLETED: "Completed",
};

// The fulfillment form submits "" for empty inputs, so treat blank and null
// as the same "no tracking info" value.
const normalise = (value?: string | null) => value?.trim() || null;

/**
 * True when the buyer should hear about the update: the fulfillment status
 * changed, or a tracking number / website was added or changed. Clearing
 * tracking info on its own doesn't notify.
 */
export const hasShipmentChanged = (
  before: ShipmentFields,
  after: ShipmentFields
) => {
  if (before.fulfillmentStatus !== after.fulfillmentStatus) {
    return true;
  }
  const trackingNumber = normalise(after.trackingNumber);
  const trackingWebsite = normalise(after.trackingWebsite);
  return (
    (!!trackingNumber && trackingNumber !== normalise(before.trackingNumber)) ||
    (!!trackingWebsite && trackingWebsite !== normalise(before.trackingWebsite))
  );
};

const toTrackingUrl = (website: string | null) => {
  if (!website) {
    return null;
  }
  const url = /^https?:\/\//i.test(website) ? website : `https://${website}`;
  try {
    return new URL(url).toString();
  } catch {
    return null;
  }
};

export const sendShipmentUpdateEmail = async (
  purchase: ShipmentFields & {
    id: string;
    quantity: number;
    merch: { title: string; profile: { name: string; urlSlug: string } };
    user: { email: string; name: string | null };
  }
) => {
  if (!purchase.user.email) {
    return;
  }
  const client = await getClient();
  const trackingWebsite = normalise(purchase.trackingWebsite);

  await sendMailQueue.add("send-mail", {
    template: "merch-shipment-update",
    message: {
      to: purchase.user.email,
    },
    locals: {
      buyerName: purchase.user.name,
      artistName: purchase.merch.profile.name,
      artistUrlSlug: purchase.merch.profile.urlSlug,
      merchTitle: purchase.merch.title,
      quantity: purchase.quantity,
      fulfillmentStatus: purchase.fulfillmentStatus,
      statusLabel: fulfillmentStatusLabels[purchase.fulfillmentStatus],
      trackingNumber: normalise(purchase.trackingNumber),
      trackingWebsite,
      trackingUrl: toTrackingUrl(trackingWebsite),
      client: client.applicationUrl,
    },
  });
};
