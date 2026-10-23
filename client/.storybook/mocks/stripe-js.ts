// Storybook stand-in for @stripe/stripe-js; see ../stripeMock.ts.
import { stripeMock } from "../stripeMock";

export const loadStripe = () =>
  Promise.resolve({
    retrievePaymentIntent: () =>
      Promise.resolve({ paymentIntent: { status: stripeMock.intentStatus } }),
  });
