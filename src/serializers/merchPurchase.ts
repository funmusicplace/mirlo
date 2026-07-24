import { serializeMerch } from "./merch";
import { Serialized } from "./utils";

export const serializeMerchPurchase = <T extends object>(
  purchase: T
): Serialized<T> => {
  const { merch, ...rest } = purchase as T & {
    merch?: Parameters<typeof serializeMerch>[0] | null;
  };
  return {
    ...rest,
    ...(merch !== undefined
      ? { merch: merch ? serializeMerch(merch) : merch }
      : {}),
  } as Serialized<T>;
};
