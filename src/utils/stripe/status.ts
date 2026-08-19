import { stripe, isSetupIntentId } from "./index";

/*
 * Retrieves the status of a PaymentIntent (pi_*) or SetupIntent (seti_*).
 */
export const getIntentStatus = async ({
  id,
  stripeAccountId,
}: {
  id: string;
  stripeAccountId: string;
}): Promise<{
  id: string;
  status: string;
  clientSecret: string | null;
  successUrl: string | null;
  amount: number | null;
  currency: string | null;
  artistId: string | null;
  requiresShipping: boolean;
  allowedCountries: string[] | null;
  userEmail: string | null;
}> => {
  if (isSetupIntentId(id)) {
    const si = await stripe.setupIntents.retrieve(
      id,
      {},
      { stripeAccount: stripeAccountId }
    );
    return {
      id: si.id,
      status: si.status,
      clientSecret: si.client_secret,
      successUrl: si.metadata?.successUrl ?? null,
      // SetupIntents authorise a payment method; there's no immediate charge.
      amount: null,
      currency: null,
      artistId: si.metadata?.artistId ?? null,
      requiresShipping: si.metadata?.requiresShipping === "true",
      allowedCountries: si.metadata?.allowedCountries?.length
        ? si.metadata.allowedCountries.split(",")
        : null,
      userEmail: si.metadata?.userEmail || null,
    };
  }
  const pi = await stripe.paymentIntents.retrieve(
    id,
    {},
    { stripeAccount: stripeAccountId }
  );
  return {
    id: pi.id,
    status: pi.status,
    clientSecret: pi.client_secret,
    successUrl: pi.metadata?.successUrl ?? null,
    amount: pi.amount,
    currency: pi.currency,
    artistId: pi.metadata?.artistId ?? null,
    requiresShipping: pi.metadata?.requiresShipping === "true",
    allowedCountries: pi.metadata?.allowedCountries?.length
      ? pi.metadata.allowedCountries.split(",")
      : null,
    userEmail: pi.metadata?.userEmail || null,
  };
};
