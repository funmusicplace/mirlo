import { stripe } from "./index";

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
}> => {
  if (id.startsWith("seti_")) {
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
  };
};
