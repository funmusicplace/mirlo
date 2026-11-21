import prisma from "@mirlo/prisma";

import logger from "../../logger";

/** How long a checkout link keeps working, paid or not. */
export const CHECKOUT_LIFETIME_DAYS = 60;

const cleanUpCheckouts = async () => {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - CHECKOUT_LIFETIME_DAYS);

  const { count } = await prisma.checkout.deleteMany({
    where: {
      createdAt: { lt: cutoff },
      NOT: { stripeId: { not: null }, completedAt: null },
    },
  });

  logger.info(
    `cleanUpCheckouts: deleted ${count} checkouts older than ${CHECKOUT_LIFETIME_DAYS} days with no unfinished payment`
  );
};

export default cleanUpCheckouts;
