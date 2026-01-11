import { PrismaClient } from "./__generated__";
import { users } from "./seeds/users";
import { hashPassword } from "../src/routers/auth/utils";
import { clients } from "./seeds/clients";
import { artists } from "./seeds/artists";
import { trackGroups } from "./seeds/trackGroups";

const prisma = new PrismaClient();

console.log("Seeding database...");
console.log("dev", process.env.NODE_ENV);
const isDev = process.env.NODE_ENV === "development";

async function main() {
  console.log(`Start seeding ...`);

  if (!isDev) {
    console.log(
      `Not in development mode, skipping seeding to prevent data overwriting.`
    );
    return;
  }

  for (const u of users) {
    u.password = await hashPassword("test1234");
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: u,
      create: u,
    });
    console.log(`Created user with id: ${user.id}`);
  }

  for (const c of clients) {
    const find = await prisma.client.findFirst({
      where: { key: c.key },
    });
    if (find) {
      console.log(`Client with key ${c.key} already exists, skipping...`);
      continue;
    }
    const user = await prisma.client.create({
      data: c,
    });
    console.log(`Created client with id: ${user.id}`);
  }

  for (const a of artists) {
    const find = await prisma.artist.findFirst({
      where: { urlSlug: a.urlSlug },
    });
    if (find) {
      console.log(
        `Artist with urlSlug ${a.urlSlug} already exists, updating...`
      );
      const updated = await prisma.artist.update({
        where: { id: find.id },
        data: a,
      });
      console.log(`...updated artist with id: ${updated.id}`);
    } else {
      const artist = await prisma.artist.create({
        data: a,
      });
      console.log(`Created artist with id: ${artist.id}`);
    }
  }

  for (const t of trackGroups) {
    const find = await prisma.trackGroup.findFirst({
      where: { urlSlug: t.urlSlug },
    });
    if (find) {
      console.log(
        `TrackGroup with urlSlug ${t.urlSlug} already exists, updating...`
      );
      const updated = await prisma.trackGroup.update({
        where: { id: find.id },
        data: t,
      });
      console.log(`...updated trackGroup with id: ${updated.id}`);
    } else {
      const trackGroup = await prisma.trackGroup.create({
        data: t,
      });
      console.log(`Created trackGroup with id: ${trackGroup.id}`);
    }
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
