import prisma from "@mirlo/prisma";
import { uniq } from "lodash";

import { calculateAppFee } from "../processingPayments";
import { getCurrency } from "../stripe/sessions";

import { resolvePayee } from "./payee";
import { getPaymentProcessor } from "./PaymentProcessor";

export type ResolvedItem = {
  type: "trackGroup" | "track" | "merch" | "tip";
  id?: string;
  quantity: number;
  amount: number;
  message?: string;
  /** merch only — selected MerchOption ids (size/colour/etc.), if any. */
  optionIds?: string[];
  /** merch only — chosen shipping destination, when the item ships physically. */
  shippingDestinationId?: string;
  /** The resource's own platformPercent override (trackGroup/merch), if set — falls back to the profile's defaultPlatformFee, then the site default. */
  platformPercent?: number | null;
};

// Fetches the profile and resolves the connected Stripe account + currency used
// for all payment operations. Shared by initiatePayment and the subscription
// lifecycle functions in ./subscription.ts.
export const resolveProfilePaymentContext = async (
  profileId: number,
  stripeAccountIdOverride?: string
) => {
  const profile = await prisma.profile.findFirst({
    where: { id: profileId, enabled: true },
    include: {
      user: { select: { stripeAccountId: true, email: true } },
      paymentToUser: { select: { stripeAccountId: true } },
    },
  });

  if (!profile) {
    throw new Error(`Artist ${profileId} not found`);
  }

  const stripeAccountId =
    stripeAccountIdOverride ?? resolvePayee({ profile }).stripeAccountId;

  if (!stripeAccountId) {
    throw new Error("Artist is not set up with a payment processor");
  }

  const currency = await getCurrency(profileId, stripeAccountId);

  return { profile, stripeAccountId, currency };
};

// Initiates a payment against the profile's connected account.
export const initiatePayment = async ({
  readerId,
  profileId,
  items,
  userEmail,
  userId,
  clientId,
  successUrl,
  stripeAccountId: stripeAccountIdOverride,
  requiresShipping,
  allowedCountries,
}: {
  readerId?: string;
  profileId: number;
  items: ResolvedItem[];
  userEmail: string;
  userId?: string;
  /** Registered API consumer (Client.id) — carried in metadata so the post-payment return can bounce to that client's applicationUrl. */
  clientId?: number;
  /** Where the hosted checkout page returns the buyer after payment (validated upstream). */
  successUrl?: string;
  /** Pre-resolved account ID — use when the item (e.g. trackGroup) has its own paymentToUser that takes precedence over the profile's. */
  stripeAccountId?: string;
  /** Physical merch in the cart — persisted onto the PaymentIntent's metadata so the hosted checkout page can recover it via getStatus after a redirect. */
  requiresShipping?: boolean;
  allowedCountries?: string[];
}): Promise<
  | { paymentIntentId: string }
  | {
      clientSecret: string | null;
      stripeAccountId: string;
      paymentIntentId: string;
    }
> => {
  const { profile, stripeAccountId, currency } =
    await resolveProfilePaymentContext(profileId, stripeAccountIdOverride);

  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);

  // Each item's own platformPercent (trackGroup/merch) takes precedence,
  // falling back to the profile's defaultPlatformFee, then the site default
  // (that last fallback happens inside calculateAppFee).
  let applicationFeeAmount = 0;
  for (const item of items) {
    applicationFeeAmount += await calculateAppFee(
      item.amount,
      currency,
      item.platformPercent ?? profile.defaultPlatformFee
    );
  }

  const purchaseTypes = uniq(items.map((i) => i.type));
  const purchaseType = purchaseTypes.length === 1 ? purchaseTypes[0] : "merch";

  const metadata: Record<string, string> = {
    purchaseType,
    stripeAccountId,
    artistId: String(profileId),
    userEmail,
    ...(userId && { userId }),
    ...(clientId !== undefined && { clientId: String(clientId) }),
    ...(successUrl && { successUrl }),
    ...(purchaseType === "trackGroup" &&
      items[0]?.id && { trackGroupId: items[0].id }),
    ...(purchaseType === "track" && items[0]?.id && { trackId: items[0].id }),
    ...(requiresShipping && { requiresShipping: "true" }),
    ...(allowedCountries?.length && {
      allowedCountries: allowedCountries.join(","),
    }),
    items: JSON.stringify(items),
  };

  const processor = getPaymentProcessor();

  if (readerId) {
    const { id } = await processor.createTerminalPayment({
      amount: totalAmount,
      currency,
      accountId: stripeAccountId,
      applicationFeeAmount,
      metadata,
      readerId,
    });
    return { paymentIntentId: id };
  }

  const { id, clientSecret } = await processor.createOnlinePayment({
    amount: totalAmount,
    currency,
    accountId: stripeAccountId,
    applicationFeeAmount,
    metadata,
  });
  return {
    clientSecret,
    stripeAccountId,
    paymentIntentId: id,
  };
};
