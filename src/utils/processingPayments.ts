import { getSiteSettings } from "./settings";

export const calculatePlatformPercent = async (
  currency: string,
  percent?: number | null
) => {
  const settings = await getSiteSettings();
  if (currency.toLowerCase() === "brl" || currency.toLowerCase() === "mxn") {
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
  platformPercent?: number | null
) => {
  const calculatedPlatformPercent = await calculatePlatformPercent(
    currency,
    platformPercent
  );

  if (calculatedPlatformPercent <= 0) {
    return 0;
  }

  // Use integer cent math to avoid floating-point leakage into fee amounts.
  return Math.round((price * calculatedPlatformPercent) / 100);
};
