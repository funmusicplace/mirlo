// A cart that's been opened for checkout. It holds the purchase request, so
// the pay call and the hosted checkout page only need its id.
import prisma from "@mirlo/prisma";
import { Prisma } from "@mirlo/prisma/client";

import { AppError } from "../error";

export const createCheckout = ({
  items,
  ...data
}: {
  profileId: number;
  items: unknown[];
  email?: string;
  successUrl?: string;
  clientId?: number;
}) =>
  prisma.checkout.create({
    data: { ...data, items: items as Prisma.InputJsonArray },
  });

/** The checkout behind a checkoutId, or a 404. */
export const findCheckout = async (id: string) => {
  const checkout = await prisma.checkout.findUnique({ where: { id } });
  if (!checkout) {
    throw new AppError({
      httpCode: 404,
      description: "This checkout doesn't exist",
    });
  }
  return checkout;
};

/** Marks the checkout paid once its intent succeeds. Safe to replay. */
export const completeCheckout = async (id?: string) => {
  if (id) {
    await prisma.checkout.updateMany({
      where: { id, completedAt: null },
      data: { completedAt: new Date() },
    });
  }
};
