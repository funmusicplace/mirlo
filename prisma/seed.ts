import { PrismaClient, Prisma } from "@prisma/client";
import { users } from "./seeds/users";
import { hashPassword } from "../src/routers/auth";
import { clients } from "./seeds/clients";

const prisma = new PrismaClient();

async function main() {
  console.log(`Start seeding ...`);
  for (const u of users) {
    u.password = await hashPassword("test1234");
    const user = await prisma.user.create({
      data: u,
    });
    console.log(`Created user with id: ${user.id}`);
  }

  for (const c of clients) {
    const user = await prisma.client.create({
      data: c,
    });
    console.log(`Created client with id: ${user.id}`);
  }
  console.log(`Seeding finished.`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
