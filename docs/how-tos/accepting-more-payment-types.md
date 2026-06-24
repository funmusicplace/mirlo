# Accepting more payment types

By default, fans buying your music and merch on Mirlo can pay with credit and
debit cards. But Stripe — the payment processor Mirlo uses — supports many more
payment methods, including PayPal, Apple Pay, Google Pay, bank transfers, and
dozens of regional options (iDEAL, Bancontact, SEPA, etc.).

Mirlo automatically offers whichever payment methods you've enabled in **your
own Stripe account**, so turning on more options is done in your Stripe
Dashboard, not in Mirlo.

## How it works

Mirlo asks Stripe to show fans every payment method that is both:

1. **Enabled on your connected Stripe account**, and
2. **Eligible for that particular transaction** (Stripe filters by the fan's
   currency, country, and device — for example, Apple Pay only appears on Apple
   devices).

This means you control the list from your Stripe Dashboard. You don't need to
change anything in Mirlo.

## Turning on more payment methods

1. Make sure you've connected a Stripe account to Mirlo first — see
   [How payouts work](../payouts.md).
2. Log in to your [Stripe Dashboard](https://dashboard.stripe.com).
3. Go to **Settings → Payments → Payment methods**, or open it directly at
   [dashboard.stripe.com/settings/payment_methods](https://dashboard.stripe.com/settings/payment_methods).
4. Browse the available methods and toggle on the ones you'd like to accept
   (for example **PayPal**, **Apple Pay**, **Google Pay**, or a regional
   method). Some methods ask you to confirm a few details or accept extra terms
   before they activate.

That's it — newly enabled methods will start appearing at checkout for eligible
fans automatically.

## A few things to know

- **Card payments and digital wallets are on by default.** Apple Pay and Google
  Pay typically work out of the box once your account is active; they only show
  up on supported devices and browsers.
- **PayPal availability depends on your country and currency.** Stripe only
  offers it where it's supported — check the PayPal entry in your dashboard.
- **Each method has its own fees and rules.** Some are cheaper than cards, some
  cost more, and some (like bank debits) settle more slowly or carry more
  chargeback risk. Stripe shows the fees next to each method.
- **You won't see a method that isn't eligible.** If a fan's currency or country
  isn't supported by a method, Stripe simply hides it for that purchase.

## Helpful Stripe documentation

- [Payment methods overview](https://docs.stripe.com/payments/payment-methods/overview) —
  the full catalog of what Stripe supports and where.
- [Manage payment methods in the Dashboard](https://docs.stripe.com/payments/payment-method-configurations) —
  how the toggles above work.
- [PayPal on Stripe](https://docs.stripe.com/payments/paypal) — supported
  countries, currencies, and requirements.
- [Apple Pay](https://docs.stripe.com/apple-pay) and
  [Google Pay](https://docs.stripe.com/google-pay) — how digital wallets appear
  at checkout.
- [Stripe country and currency support](https://stripe.com/global) — verify
  what's available in your region.

## Related documentation

- [How payouts work](../payouts.md) — fees, schedules, and how money reaches you
- [Setting up an artist account](./setting-up-an-artist-account.md)
