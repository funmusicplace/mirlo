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
  profileId: string | null;
  error: string | null;
}> => {
  if (isSetupIntentId(id)) {
    const intent = await stripe.setupIntents.retrieve(
      id,
      {},
      { stripeAccount: stripeAccountId }
    );
    return {
      id: intent.id,
      status: intent.status,
      profileId: intent.metadata?.artistId ?? null,
      error: intent.last_setup_error?.message ?? null,
    };
  }

  const intent = await stripe.paymentIntents.retrieve(
    id,
    {},
    { stripeAccount: stripeAccountId }
  );
  return {
    id: intent.id,
    status: intent.status,
    profileId: intent.metadata?.artistId ?? null,
    error: intent.last_payment_error?.message ?? null,
  };
};
