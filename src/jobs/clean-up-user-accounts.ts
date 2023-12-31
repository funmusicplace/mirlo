import prisma from "../../prisma/prisma";
import logger from "../logger";
import { faker } from "@faker-js/faker";
import { hashPassword } from "../routers/auth";

const cleanUpUserAccounts = async () => {
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
};

export default cleanUpUserAccounts;
