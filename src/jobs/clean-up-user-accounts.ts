import prisma from "@mirlo/prisma";
import logger from "../logger";
import { faker } from "@faker-js/faker";
import { hashPassword } from "../routers/auth/utils";

const cleanUpUserAccounts = async () => {
  try {
    logger.info(`cleanUpUserAccounts script started`);

    const today = new Date();
    const sixMonthsAgo = today.setMonth(today.getMonth() - 6);
    const deletedUsers = await prisma.user.findMany({
      where: {
        deletedAt: { lte: new Date(sixMonthsAgo) },
      },
    });

    for (const user of deletedUsers) {
      // Anonymize users
      await prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          email: faker.internet.email(),
          name: "deletedUser",
          password: await hashPassword(faker.internet.password()),
          isAdmin: false,
          currency: null,
          stripeAccountId: null,
          receiveMailingList: false,
        },
      });
    }
  } catch (error) {
    logger.error("Error cleaning up user accounts", error);
  }
  logger.info(`cleanUpUserAccounts script finished`);
};

export default cleanUpUserAccounts;
