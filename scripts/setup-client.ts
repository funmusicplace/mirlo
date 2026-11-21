import crypto from "crypto";

import prisma from "@mirlo/prisma";

import { getClient } from "../src/utils/getClient";

async function setupClient() {
  console.log("\nCreating client...\n");

  const applicationUrl = process.env.MIRLO_DOMAIN;

  if (!applicationUrl) {
    console.error("❌ Error: MIRLO_DOMAIN environment variable is required");
    process.exit(1);
  }

  try {
    const client = await getClient();
    await prisma.client.update({
      where: { id: client.id },
      data: {
        applicationUrl,
        allowedCorsOrigins: [applicationUrl],
        key: client.key ?? crypto.randomUUID(),
      },
    });
    console.log(`\n✓ Client set to ${applicationUrl}\n`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error setting up client:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

setupClient();
