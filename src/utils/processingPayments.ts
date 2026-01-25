import { getSiteSettings } from "./settings";

export const calculatePlatformPercent = async (
  currency: string,
  percent?: number | null
) => {
  const settings = await getSiteSettings();
  if (currency.toLowerCase() === "brl" || currency.toLowerCase() === "mxn") {
    return 0;
  }
  return (percent ?? settings.platformPercent ?? 7) / 100;
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

  const appFee = castToFixed(price * calculatedPlatformPercent);
  return appFee || 0;
};
