import { faker } from "@faker-js/faker";

import generateSlug from "../../src/utils/generateSlug";
import prisma from "../prisma";

import {
  createMinioClient,
  ensureBuckets,
  generateAndUploadImage,
} from "./publishedTrackGroups";

const MERCH_PREFIX = "merch-images";
const MERCH_SIZES = [1500, 1200, 960, 600, 300, 120, 60];
const ITEMS_PER_ARTIST = 3;

const ARTIST_SLUGS = [
  "blackbird",
  "robin",
  "crow",
  "a-flock-of-gulls",
  "herring-gull",
];

const MERCH_TITLES = [
  "T-Shirt",
  "Hoodie",
  "Tote Bag",
  "Vinyl Record",
  "Enamel Pin",
  "Poster",
  "Sticker Pack",
];

function randomMerchTitle(): string {
  const base = MERCH_TITLES[Math.floor(Math.random() * MERCH_TITLES.length)];
  return `${faker.word.adjective()} ${base}`;
}

export async function seedMerch() {
  const artistResults = await Promise.all(
    ARTIST_SLUGS.map((slug) =>
      prisma.profile.findFirst({ where: { urlSlug: slug } })
    )
  );
  const artists = artistResults.filter(
    (a): a is NonNullable<typeof a> => a !== null
  );

  if (artists.length === 0) {
    console.log("No artists found, skipping merch seeding");
    return;
  }

  const minioClient = createMinioClient();
  if (minioClient) {
    await ensureBuckets(minioClient);
  } else {
    console.log("MINIO_HOST not set — merch images will be skipped");
  }

  for (const artist of artists) {
    const existing = await prisma.merch.findFirst({
      where: { artistId: artist.id },
    });
    if (existing) {
      console.log(`Merch already exists for ${artist.name}, skipping`);
      continue;
    }

    for (let i = 0; i < ITEMS_PER_ARTIST; i++) {
      const title = randomMerchTitle();
      const urlSlug = generateSlug(title);
      // Give the first item size options, and the first two a shipping
      // destination, so the seeded catalog exercises the option/shipping
      // branches of the unified purchase flow, not just the plain case.
      const hasSizeOptions = i === 0;
      const requiresShipping = i < 2;

      try {
        const merch = await prisma.merch.create({
          data: {
            title,
            urlSlug,
            description: faker.lorem.paragraph(),
            minPrice: 1000 + i * 500,
            quantityRemaining: 20,
            isPublic: true,
            artist: { connect: { id: artist.id } },
          },
        });

        if (requiresShipping) {
          await prisma.merchShippingDestination.create({
            data: {
              merchId: merch.id,
              homeCountry: "us",
              destinationCountry: null,
              costUnit: 500,
              costExtraUnit: 100,
            },
          });
        }

        if (hasSizeOptions) {
          const optionType = await prisma.merchOptionType.create({
            data: { merchId: merch.id, optionName: "size" },
          });
          for (const size of ["small", "medium", "large"]) {
            await prisma.merchOption.create({
              data: {
                merchOptionTypeId: optionType.id,
                name: size,
                quantityRemaining: 10,
              },
            });
          }
        }

        if (minioClient) {
          try {
            const { id: imageId, urls } = await generateAndUploadImage(
              minioClient,
              MERCH_PREFIX,
              MERCH_SIZES
            );
            await prisma.merchImage.create({
              data: {
                id: imageId,
                merchId: merch.id,
                url: urls,
              },
            });
            console.log(`  → Merch image uploaded (${urls.length} sizes)`);
          } catch (err) {
            console.warn(
              `  ⚠ Merch image upload failed:`,
              err instanceof Error ? err.message : err
            );
          }
        }

        console.log(
          `Created merch "${title}" for ${artist.name} (id: ${merch.id})`
        );
      } catch (err) {
        console.error(
          `❌ Error creating merch "${title}" for ${artist.name}:`,
          err
        );
      }
    }
  }

  console.log(
    `Merch seeding complete (${artists.length * ITEMS_PER_ARTIST} attempted).`
  );
}
