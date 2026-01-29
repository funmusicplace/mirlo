import { PrismaClient } from "../prisma/__generated__";
import { hashPassword } from "../src/routers/auth/utils";

const prisma = new PrismaClient();

async function setupAdminUser() {
  console.log("\nCreating admin user...\n");

  // Get from environment variables
  let email = process.env.ADMIN_EMAIL;
  let password = process.env.ADMIN_PASSWORD;
  let name = process.env.ADMIN_NAME;

  // If running interactively (terminal is attached), use defaults
  if (!email && !password && !name && process.stdin.isTTY) {
    console.error("❌ Error: ADMIN_PASSWORD environment variable is required");
    process.exit(1);
  }

  // Validate required fields
  if (!email) {
    email = "admin@mirlo.local";
  }
  if (!password) {
    console.error("❌ Error: ADMIN_PASSWORD environment variable is required");
    process.exit(1);
  }
  if (!name) {
    name = "Administrator";
  }

  try {
    console.log(`\nCreating admin user with email: ${email}`);

    const hashedPassword = await hashPassword(password);

    const user = await prisma.user.upsert({
      where: { email },
      update: {
        password: hashedPassword,
        name,
        isAdmin: true,
      },
      create: {
        email,
        password: hashedPassword,
        name,
        isAdmin: true,
      },
    });

    console.log(`\n✓ Admin user created/updated successfully`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Name: ${user.name}`);
    console.log(`  Admin: ${user.isAdmin}\n`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error setting up admin user:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

setupAdminUser();
