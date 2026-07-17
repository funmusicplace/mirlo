import crypto from "crypto";

import { PrismaClient } from "../prisma/__generated__";

const prisma = new PrismaClient();

async function setupClient() {
  console.log("\nCreating client...\n");

  const applicationUrl = process.env.MIRLO_DOMAIN;

  if (!applicationUrl) {
    console.error("❌ Error: MIRLO_DOMAIN environment variable is required");
    process.exit(1);
  }

  try {
    const existing = await prisma.client.findFirst({
      where: { applicationUrl },
    });

    if (existing) {
      await prisma.client.update({
        where: { id: existing.id },
        data: { allowedCorsOrigins: [applicationUrl] },
      });
      console.log(`\n✓ Client already exists for ${applicationUrl}\n`);
    } else {
      await prisma.client.create({
        data: {
          applicationName: "frontend",
          applicationUrl,
          allowedCorsOrigins: [applicationUrl],
          key: crypto.randomUUID(),
        },
      });
      console.log(`\n✓ Client created for ${applicationUrl}\n`);
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Error setting up client:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

setupClient();
