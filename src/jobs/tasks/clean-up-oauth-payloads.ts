import prisma from "@mirlo/prisma";

import logger from "../../logger";

const cleanUpOAuthPayloads = async () => {
  const { count } = await prisma.oAuthPayload.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });

  logger.info(`cleanUpOAuthPayloads: deleted ${count} expired rows`);
};

export default cleanUpOAuthPayloads;
