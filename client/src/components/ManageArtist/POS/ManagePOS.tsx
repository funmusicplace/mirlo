import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { loadStripe, Stripe } from "@stripe/stripe-js";
import { useQuery } from "@tanstack/react-query";
import { Button } from "components/common/Button";
import { InputEl } from "components/common/Input";
import {
  queryManagedArtist,
  queryManagedArtistMerch,
  queryManagedArtistSubscriptionTiers,
  queryManagedArtistTrackGroups,
  queryUserStripeStatus,
} from "queries";
import React from "react";
import { useParams } from "react-router-dom";
import api from "services/api";

import { ManageSectionWrapper } from "../ManageSectionWrapper";

const stripeKey = import.meta.env.VITE_PUBLISHABLE_STRIPE_KEY;

// The /purchase endpoint accepts a list of these.
type PurchaseItem =
  | { type: "trackGroup"; id: number }
  | { type: "merch"; id: string; quantity?: number }
  | { type: "subscription"; tierId: number };

type PurchaseResponse = {
  paymentIntentId?: string;
  setupIntentId?: string;
  clientSecret?: string;
  redirectUrl?: string;
};

const formatPrice = (cents?: number, currency?: string) =>
  `${((cents ?? 0) / 100).toFixed(2)} ${(currency ?? "usd").toUpperCase()}`;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Online (no reader) flow: render the Payment Element on the connected account
 * and confirm the PaymentIntent with Stripe.js.
 */
const OnlinePaymentForm: React.FC<{ onDone: (status: string) => void }> = ({
  onDone,
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = React.useState(false);

  const handleSubmit = async () => {
    if (!stripe || !elements) return;
    setIsLoading(true);
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: window.location.href },
      redirect: "if_required",
    });
    setIsLoading(false);
    if (error) {
      onDone(`error: ${error.message ?? "payment failed"}`);
    } else {
      onDone(paymentIntent?.status ?? "submitted");
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <PaymentElement options={{ layout: "accordion" }} />
      <Button
        onClick={handleSubmit}
        isLoading={isLoading}
        disabled={!stripe || !elements}
      >
        Confirm online payment
      </Button>
    </div>
  );
};

const OnlinePaymentWrapper: React.FC<{
  clientSecret: string;
  stripeAccountId: string;
  onDone: (status: string) => void;
}> = ({ clientSecret, stripeAccountId, onDone }) => {
  const [stripe, setStripe] = React.useState<Stripe | null>(null);

  React.useEffect(() => {
    if (stripeKey) {
      loadStripe(stripeKey, { stripeAccount: stripeAccountId }).then(setStripe);
    }
  }, [stripeAccountId]);

  if (!stripe) return null;

  return (
    <Elements stripe={stripe} options={{ clientSecret }}>
      <OnlinePaymentForm onDone={onDone} />
    </Elements>
  );
};

/**
 * Quick-and-dirty point-of-sale page. Lists everything an artist sells and
 * pushes a single item at a time through POST /v1/purchase. With a reader id it
 * dispatches to a Stripe Terminal reader and polls for the result; without one
 * it falls back to the online Payment Element so the whole endpoint surface can
 * be exercised in one place.
 */
const ManagePOS: React.FC = () => {
  const { artistId } = useParams();
  const numericArtistId = Number(artistId);

  const { data: artist } = useQuery(queryManagedArtist(numericArtistId));
  const { data: trackGroups } = useQuery(
    queryManagedArtistTrackGroups({ artistId: numericArtistId })
  );
  const { data: merch } = useQuery(
    queryManagedArtistMerch({ artistId: numericArtistId })
  );
  const { data: tiers } = useQuery(
    queryManagedArtistSubscriptionTiers({ artistId: numericArtistId })
  );

  const paymentUserId = artist?.paymentToUserId ?? artist?.userId;
  const { data: stripeStatus } = useQuery(queryUserStripeStatus(paymentUserId));
  const stripeAccountId = stripeStatus?.stripeAccountId;

  const [readerId, setReaderId] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [activeLabel, setActiveLabel] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);
  const [onlineCheckout, setOnlineCheckout] = React.useState<{
    clientSecret: string;
  } | null>(null);
  const [isCharging, setIsCharging] = React.useState(false);

  const pollIntent = React.useCallback(
    async (intentId: string) => {
      if (!stripeAccountId) return;
      for (let attempt = 0; attempt < 40; attempt++) {
        const { result } = await api.get<{ id: string; status: string }>(
          `purchase/${intentId}?stripeAccountId=${stripeAccountId}`
        );
        setMessage(`Reader status: ${result.status}`);
        if (result.status === "succeeded" || result.status === "canceled") {
          return;
        }
        await sleep(1500);
      }
      setMessage("Timed out waiting for the reader to complete.");
    },
    [stripeAccountId]
  );

  const charge = async (item: PurchaseItem, label: string) => {
    setActiveLabel(label);
    setMessage(null);
    setOnlineCheckout(null);
    setIsCharging(true);
    try {
      const response = await api.post<
        {
          artistId: number;
          readerId?: string;
          email?: string;
          items: PurchaseItem[];
        },
        PurchaseResponse
      >("purchase", {
        artistId: numericArtistId,
        readerId: readerId.trim() || undefined,
        email: email.trim() || undefined,
        items: [item],
      });

      if (response.clientSecret) {
        setOnlineCheckout({ clientSecret: response.clientSecret });
        setMessage("Complete the online payment below.");
      } else if (response.redirectUrl) {
        setMessage(`Free purchase complete → ${response.redirectUrl}`);
      } else if (response.paymentIntentId || response.setupIntentId) {
        const intentId = (response.paymentIntentId ??
          response.setupIntentId) as string;
        setMessage(`Dispatched to reader (${intentId}). Polling…`);
        await pollIntent(intentId);
      } else {
        setMessage("Purchase initiated.");
      }
    } catch (e) {
      setMessage(`Error: ${(e as Error).message}`);
    } finally {
      setIsCharging(false);
    }
  };

  if (!artist) return null;

  const sectionClass = "flex flex-col gap-2 mb-6";
  const rowClass =
    "flex items-center justify-between gap-3 py-2 border-b border-gray-200";

  return (
    <ManageSectionWrapper>
      <h2 className="text-xl font-bold mb-1">Point of sale</h2>
      <p className="text-sm mb-4">
        Charges a single item through <code>POST /v1/purchase</code>. Enter a
        Stripe Terminal reader id for in-person card-present payments; leave it
        blank to complete an online payment with the Payment Element.
      </p>

      <div className="flex flex-col gap-2 mb-6 max-w-md">
        <label className="text-sm font-bold" htmlFor="pos-reader">
          Reader id (optional)
        </label>
        <InputEl
          id="pos-reader"
          name="readerId"
          placeholder="tmr_..."
          value={readerId}
          onChange={(e) => setReaderId(e.target.value)}
        />
        <label className="text-sm font-bold" htmlFor="pos-email">
          Buyer email (optional)
        </label>
        <InputEl
          id="pos-email"
          name="email"
          placeholder="buyer@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        {!stripeAccountId && (
          <p className="text-sm text-red-600">
            This artist has no connected Stripe account — charges will fail.
          </p>
        )}
      </div>

      {message && (
        <div className="mb-4 p-3 rounded bg-gray-100 text-sm">
          {activeLabel && <strong>{activeLabel}: </strong>}
          {message}
        </div>
      )}

      {onlineCheckout && stripeAccountId && (
        <div className="mb-6 p-3 rounded border border-gray-300 max-w-md">
          <OnlinePaymentWrapper
            clientSecret={onlineCheckout.clientSecret}
            stripeAccountId={stripeAccountId}
            onDone={(status) => {
              setMessage(`Online payment: ${status}`);
              if (status === "succeeded") setOnlineCheckout(null);
            }}
          />
        </div>
      )}

      <div className={sectionClass}>
        <h3 className="text-lg font-bold">Releases</h3>
        {(trackGroups?.results ?? []).map((tg) => (
          <div className={rowClass} key={tg.id}>
            <span>
              {tg.title ?? "Untitled"} — {formatPrice(tg.minPrice, tg.currency)}
            </span>
            <Button
              size="compact"
              disabled={isCharging}
              onClick={() =>
                charge({ type: "trackGroup", id: tg.id }, tg.title ?? "Release")
              }
            >
              Charge
            </Button>
          </div>
        ))}
        {(trackGroups?.results ?? []).length === 0 && (
          <p className="text-sm">No releases.</p>
        )}
      </div>

      <div className={sectionClass}>
        <h3 className="text-lg font-bold">Merch</h3>
        {(merch?.results ?? []).map((m) => (
          <div className={rowClass} key={m.id}>
            <span>
              {m.title} — {formatPrice(m.minPrice, m.currency)}
            </span>
            <Button
              size="compact"
              disabled={isCharging}
              onClick={() =>
                charge({ type: "merch", id: m.id, quantity: 1 }, m.title)
              }
            >
              Charge
            </Button>
          </div>
        ))}
        {(merch?.results ?? []).length === 0 && (
          <p className="text-sm">No merch.</p>
        )}
      </div>

      <div className={sectionClass}>
        <h3 className="text-lg font-bold">Subscriptions</h3>
        <p className="text-sm">
          Subscriptions require a reader id (online subscriptions are not yet
          supported by this endpoint).
        </p>
        {(tiers?.results ?? []).map((tier) => (
          <div className={rowClass} key={tier.id}>
            <span>
              {tier.name} — {formatPrice(tier.minAmount, artist.user?.currency)}{" "}
              / {tier.interval.toLowerCase()}
            </span>
            <Button
              size="compact"
              disabled={isCharging || !readerId.trim()}
              onClick={() =>
                charge({ type: "subscription", tierId: tier.id }, tier.name)
              }
            >
              Charge
            </Button>
          </div>
        ))}
        {(tiers?.results ?? []).length === 0 && (
          <p className="text-sm">No subscription tiers.</p>
        )}
      </div>
    </ManageSectionWrapper>
  );
};

export default ManagePOS;
