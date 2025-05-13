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
