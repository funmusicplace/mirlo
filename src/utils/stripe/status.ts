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
}): Promise<{ id: string; status: string }> => {
  if (id.startsWith("seti_")) {
    const si = await stripe.setupIntents.retrieve(
      id,
      {},
      { stripeAccount: stripeAccountId }
    );
    return { id: si.id, status: si.status };
  }
  const pi = await stripe.paymentIntents.retrieve(
    id,
    {},
    { stripeAccount: stripeAccountId }
  );
  return { id: pi.id, status: pi.status };
};
