import prisma from "@mirlo/prisma";

import logger from "../../logger";
import { recordPaymentAccountStatus } from "../../utils/paymentAccountStatus";
import { getPaymentProcessor } from "../../utils/payments/PaymentProcessor";

const syncPaymentAccountStatuses = async () => {
  const users = await prisma.user.findMany({
    where: { stripeAccountId: { not: null }, deletedAt: null },
    select: { id: true, stripeAccountId: true },
  });
  const userIdByAccountId = new Map(
    users.flatMap((user) =>
      user.stripeAccountId ? [[user.stripeAccountId, user.id] as const] : []
    )
  );

  const summary: {
    users: number;
    matched: number;
    updated: number;
    error?: string;
  } = { users: users.length, matched: 0, updated: 0 };

  try {
    for await (const status of getPaymentProcessor().listAccountStatuses()) {
      const userId = userIdByAccountId.get(status.accountId);
      if (userId === undefined) {
        continue;
      }
      summary.matched += 1;
      if (await recordPaymentAccountStatus(userId, status.canReceivePayments)) {
        summary.updated += 1;
      }
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    summary.error = `stopped after ${summary.matched} accounts: ${message}`;
    logger.error(`syncPaymentAccountStatuses: ${summary.error}`);
    return summary;
  }

  logger.info(
    `syncPaymentAccountStatuses: ${summary.users} users with a payment account, ${summary.matched} matched at the processor, ${summary.updated} updated`
  );
  return summary;
};

export default syncPaymentAccountStatuses;
