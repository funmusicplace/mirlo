/**
 * Controls the Stripe stand-in that Storybook aliases in for
 * `@stripe/react-stripe-js` and `@stripe/stripe-js` (see main.ts). Real
 * Stripe.js can't load here: it needs network access and a real connected
 * account. `preview.tsx` resets this before every story; stories that want a
 * different outcome set it in their own `beforeEach`.
 */
export const stripeMock: {
  /** What the next confirmPayment/confirmSetup resolves with. */
  outcome: "succeeded" | "declined";
  /** Each confirm call, in order. */
  confirmed: { method: "payment" | "setup"; clientSecret: string }[];
} = { outcome: "succeeded", confirmed: [] };

export const resetStripeMock = (
  outcome: typeof stripeMock.outcome = "succeeded"
) => {
  stripeMock.outcome = outcome;
  stripeMock.confirmed = [];
};
