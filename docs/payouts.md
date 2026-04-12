# How payouts work on Mirlo

## Overview

Mirlo uses **Stripe Connect** to handle all payment processing and artist payouts. When someone purchases from your music or merch, Stripe processes the payment and automatically manages the payout to your bank account on your configured schedule (typically daily or weekly). Mirlo never handles money directly—we're the platform facilitating the transaction.

## Getting Started with Payouts

### 1. Create a Stripe Connected Account

To receive payments, you first need to set up a Stripe Connected Account:

1. Log in to Mirlo
2. Use the menu to navigate to **Manage artists**
3. Click **Set up bank account**
4. You'll be redirected to Stripe's hosted onboarding flow
5. Complete the signup with:
   - Business/personal information
   - Bank account details for payouts
   - Tax information (varies by country)

Once complete, you'll be redirected back to Mirlo with an active Stripe Connected Account.

### 2. Set Your Payout Schedule

After connecting Stripe, log into your [Stripe Dashboard](https://dashboard.stripe.com):

1. Go to **Settings** → **Payouts** (in the left sidebar under "Balances")
2. Set your payout schedule:
   - **Daily** (default, fastest option)
   - **Weekly** (e.g., every Monday)
   - **Monthly** (end of month)
3. Stripe will transfer your earnings on that schedule, minus their processing fees

Your payout schedule is managed entirely through Stripe—Mirlo respects whatever you set there.

## How Money Flows

### Payment Journey: Customer → Artist

When someone buys your album, track, or merchandise:

```
Customer makes purchase
         ↓
Stripe processes payment (2.9% + $0.30 fee) ← Stripe's cut
         ↓
Mirlo platform takes commission (you get to set this, but the default is 10%)
         ↓
Your balance = Sale price - Stripe fee - Platform commission
         ↓
Automatic payout to your bank account on your scheduled day
```

### Example: $10 Album Sale

| Item                             | Amount    |
| -------------------------------- | --------- |
| Sale Price                       | $10.00    |
| Stripe Processing (2.9% + $0.30) | -$0.59    |
| Mirlo Platform Fee (10%)         | -$1.00    |
| **Your Payout**                  | **$8.41** |

## Fee Structure

### Platform Commission

- **Default:** 10% of the sale price
- **Your custom rate:** Artists can override the platform fee at:
  - Global level (applies to everything)
  - Per-item level (e.g., 7% for subscriptions, 10% for albums)
  - Per-tier level (e.g., different rates for different price tiers)

### Stripe Processing Fees

Stripe charges for payment processing:

- **Standard credit/debit cards:** 2.9% + $0.30
- **Digital wallets** (Apple Pay, Google Pay): Same as cards
- **Regional methods** (varies by country): Handled by Stripe

**Important:** Stripe's fee comes out of the customer's payment, reducing your revenue.

### Regional Discounts

Some regions have special platform fee rates. This is because they don't allow platforms to take a fee on transactions. We don't super mind.

- **Brazil (BRL)** and **Mexico (MXN):** 0% Mirlo platform fee

## What Can You Sell and Get Paid For?

Payouts are triggered by:

- **Album/Track Sales** - When someone purchases your music
- **Subscriptions** - Monthly recurring payments from subscribers
- **Merchandise** - Physical merch sales
- **Tips/Gifts** - Direct fan support
- **Fundraisers** - Pledge payments (for fundraiser campaigns)

All of these create transactions that contribute to your payout balance.

## Tracking Your Earnings

### Real-Time Dashboard

Visit **Sales** in your Mirlo artist dashboard to see:

- Transaction history with dates and amounts
- Fee breakdown (Mirlo commission + Stripe fees)
- Filters by date range, specific albums/tracks, or artists
- CSV export for accounting/bookkeeping

### Monthly Income Report

Mirlo sends automated monthly emails summarizing:

- Total transactions
- Platform and Stripe fees deducted
- Net amount owed to you

This is informational—your actual payout is handled by Stripe. They can also be a little flake-y so if you didn't get yours, let us know.

### Stripe Dashboard

For even more detail, log into your [Stripe Dashboard](https://dashboard.stripe.com) to see:

- Payment processing details
- Payout history and schedule
- Disputes or failed charges
- Account balance

## When Do You Get Paid?

### Payment Receipt Timeline

1. **Customer purchases** → Transaction appears in Mirlo dashboard immediately
2. **Stripe processes** → Payment processes (typically within seconds, secured after 3-5 days)
3. **Fees deducted** → Platform and Stripe fees are automatically calculated and reserved
4. **Payout scheduled** → Your configured payout date (daily/weekly/monthly)
5. **Deposit arrives** → Funds transfer to your bank account (typically 1-2 business days)

**Note:** Stripe typically holds funds for 3-5 days before releasing them for payout. You can see your current balance in the Stripe Dashboard.

## Payment Methods Accepted

### From Customers (What Mirlo Accepts)

Sellers on our platform can customize what types of payment methods they accept. Some cary more risk than others, refer to your Stripe dashboard for more details.

Customers can pay with:

- Credit cards (Visa, Mastercard, American Express)
- Debit cards
- Digital wallets (Apple Pay, Google Pay)
- Bank transfer methods (varies by country via Stripe)
- Regional payment methods (70+ countries supported)

### To Artists (How You Receive Money)

Stripe supports payouts to:

- **Bank accounts (primary)** - Direct deposit to savings/checking
- **Debit cards** - Where supported by Stripe
- **195+ countries** - Stripe covers most countries worldwide

Check [Stripe's country support](https://stripe.com/global) to verify your location.

## Account Setup & Requirements

To accept payments on Mirlo, Stripe requires:

- **Personal/business information** - Name, address, DOB (for legal compliance)
- **Bank account details** - For payouts (must be in account holder's name)
- **Tax information** - Varies by country (US requires SSN/EIN, EU requires VAT, etc.)
- **Business type** - Individual, sole proprietor, or company
- **Agree to Stripe's terms** - Required for account activation

Stripe verifies this information, which typically takes less than 1 business day.

## Troubleshooting & Common Questions

### Why isn't my payout appearing?

1. **Check your bank account** - Payouts take 1-2 business days
2. **Verify your schedule** - Log into Stripe and confirm your payout schedule
3. **Check minimum balance** - Stripe won't payout if your balance is below their minimum (usually $0.01, but verify)
4. **Contact Stripe support** - If funds disappeared, Stripe's dashboard shows detailed history

### Can I change my payout method?

Yes, within Stripe:

1. Go to **Settings** → **Payouts** in your Stripe Dashboard
2. Add a new bank account or debit card
3. Stripe will verify the new method (takes 1-2 business days)

### Can I dispute a platform fee?

The platform fee is set by you (artist) or the default. If you believe it's incorrect:

1. Check your actual fee setting in Mirlo artist settings
2. You can change your platform fee anytime for future sales
3. Past fees cannot be disputed retroactively (they're part of the sale terms)

### What if I don't have a Stripe account?

You won't be able to receive payments on Mirlo until you connect Stripe. Create an account at [stripe.com](https://stripe.com) with your email, then connect it through Mirlo.

We are actively changing our code to accomodate other payout providers like PayPal and Taler, but this takes time.

### Can I use Stripe in my country?

Check [Stripe's supported countries](https://stripe.com/global) and [Stripe's payout countries](https://stripe.com/en-us/world). A lot of countries are supported, but some have restrictions based on business type or currency.

## Related Documentation

- [Mirlo FAQ](./faq.md) - General questions about the platform
- [Stripe Connect Documentation](https://stripe.com/docs/connect) - In-depth Stripe information
- [Artist Guide](./how-tos/setting-up-an-artist-account.md) - How to set up your artist profile
