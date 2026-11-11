import prisma from "@mirlo/prisma";

import logger from "../../logger";

const cleanUpOAuthPayloads = async () => {
  const { count } = await prisma.oAuthPayload.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });

  const grants = await prisma.$executeRaw`
    DELETE FROM "OAuthPayload" AS g
    WHERE g.model = 'Grant'
      AND (g.payload->>'iat')::bigint < extract(epoch FROM now() - interval '1 hour')
      AND NOT EXISTS (SELECT 1 FROM "OAuthPayload" AS t WHERE t."grantId" = g.id)
  `;

  logger.info(
    `cleanUpOAuthPayloads: deleted ${count} expired rows and ${grants} grants without live tokens`
  );
};

export default cleanUpOAuthPayloads;
