import prisma from "@mirlo/prisma";

import { applyTrustSignal } from "./trustLevel";

export const recordPaymentAccountStatus = async (
  userId: number,
  canReceivePayments: boolean
) => {
  const updated = await prisma.user.updateMany({
    where: { id: userId, canReceivePayments: { not: canReceivePayments } },
    data: { canReceivePayments },
  });
  if (updated.count > 0 && canReceivePayments) {
    await applyTrustSignal(userId, "PAYMENT_ACCOUNT_VERIFIED");
  }
  return updated.count > 0;
};
