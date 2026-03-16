import { AppError } from "./error";

export const determinePrice = (
  userSubmittedPrice?: string,
  minPrice?: number | null
) => {
  const priceNumber =
    (userSubmittedPrice ? Number(userSubmittedPrice) : undefined) ??
    minPrice ??
    0;

  const isPriceZero = (minPrice ?? 0) === 0 && priceNumber === 0;

  if (priceNumber < (minPrice ?? 0)) {
    throw new AppError({
      httpCode: 400,
      description: `Have to pay at least ${minPrice} for this item. ${priceNumber} is not enough`,
    });
  }

  return { priceNumber, isPriceZero };
};

export const normalizeDiscountPercent = (
  discountPercent: unknown
): number | undefined => {
  if (
    discountPercent === undefined ||
    discountPercent === null ||
    discountPercent === ""
  ) {
    return undefined;
  }

  const parsed = Number(discountPercent);
  if (!Number.isFinite(parsed)) {
    return undefined;
  }

  return Math.min(100, Math.max(0, Math.round(parsed)));
};

export const calculateDiscountedPrice = (
  priceNumber: number,
  discountPercent: unknown
) => {
  const normalizedDiscountPercent =
    normalizeDiscountPercent(discountPercent) ?? 0;
  const roundedDiscountAmount = Number(
    ((priceNumber * normalizedDiscountPercent) / 100).toFixed()
  );
  const discountAmount =
    normalizedDiscountPercent > 0
      ? Math.min(roundedDiscountAmount, priceNumber)
      : 0;
  const discountedPriceNumber = Math.max(0, priceNumber - discountAmount);

  return {
    normalizedDiscountPercent,
    discountAmount,
    discountedPriceNumber,
  };
};
