import { getSiteSettings } from "./settings";

// Stripe rejects application_fee_amount when the platform is in one
// jurisdiction and the connected account is in another that Stripe doesn't
// allow cross-border fees for. We skip the platform cut for those countries
// (and their currencies, which catches the case where the account country
// isn't propagated) so the purchase itself can complete. See #1614.
const COUNTRIES_WITHOUT_CROSS_BORDER_APP_FEES = new Set(["MX", "BR"]);
const CURRENCIES_WITHOUT_PLATFORM_FEE = new Set(["mxn", "brl"]);

const shouldSkipPlatformFee = (currency: string, country?: string | null) => {
  if (country && COUNTRIES_WITHOUT_CROSS_BORDER_APP_FEES.has(country.toUpperCase())) {
    return true;
  }
  return CURRENCIES_WITHOUT_PLATFORM_FEE.has(currency.toLowerCase());
};

export const calculatePlatformPercent = async (
  currency: string,
  percent?: number | null,
  country?: string | null
) => {
  const settings = await getSiteSettings();
  if (shouldSkipPlatformFee(currency, country)) {
    return 0;
  }
  return percent ?? settings.platformPercent ?? 7;
};

export const castToFixed = (val: number) => {
  return Number(val.toFixed());
};

export const calculateAppFee = async (
  price: number,
  currency: string,
  platformPercent?: number | null,
  country?: string | null
) => {
  const calculatedPlatformPercent = await calculatePlatformPercent(
    currency,
    platformPercent,
    country
  );

  if (calculatedPlatformPercent <= 0) {
    return 0;
  }

  // Use integer cent math to avoid floating-point leakage into fee amounts.
  return Math.round((price * calculatedPlatformPercent) / 100);
};
