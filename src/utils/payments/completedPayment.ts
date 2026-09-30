export type PlatformCurrencyValue = {
  platformCurrencyAmount: number | null; // `amount` converted to platformCurrency, in cents
  platformCurrency: string | null;
  exchangeRate: number | null;
};

export const EMPTY_PLATFORM_CURRENCY_VALUE: PlatformCurrencyValue = {
  platformCurrencyAmount: null,
  platformCurrency: null,
  exchangeRate: null,
};

export const withPlatformCurrency = (value?: PlatformCurrencyValue) =>
  value ?? EMPTY_PLATFORM_CURRENCY_VALUE;

export type CompletedPayment = {
  id: string;
  amount: number;
  currency: string;
  metadata: Record<string, string>;
  platformCut: number;
  processorFee: number;
  platformCurrencyValue: PlatformCurrencyValue;
  shippingAddress: { name?: string | null; address?: object | null } | null;
};
