import { randomFillSync, randomUUID } from "crypto";
import { promises as fsPromises } from "fs";
import os from "os";
import path from "path";

import { faker } from "@faker-js/faker";
import ffmpeg from "fluent-ffmpeg";
import * as Minio from "minio";
import sharp from "sharp";

import generateSlug from "../../src/utils/generateSlug";
import prisma from "../prisma";

const FINAL_COVERS_BUCKET = "trackgroup-covers";
const COVER_SIZES = [1500, 1200, 960, 600, 300, 120, 60];

const FINAL_AVATAR_BUCKET = "artist-avatars";
const AVATAR_SIZES = [1500, 1200, 960, 600, 300, 120, 60];

const FINAL_AUDIO_BUCKET = "track-audio";
const NOISE_TYPES = ["white", "pink", "brown"] as const;
const NOISE_DURATION_SECS = 20;
const TRACKS_PER_ALBUM = 3;
const ALBUMS_PER_ARTIST = 5;

const ARTIST_SLUGS = [
  "blackbird",
  "robin",
  "crow",
  "a-flock-of-gulls",
  "herring-gull",
];

const {
  MINIO_HOST,
  MINIO_ROOT_USER = "",
  MINIO_ROOT_PASSWORD = "",
  MINIO_API_PORT = "9000",
} = process.env;

function createMinioClient(): Minio.Client | null {
  if (!MINIO_HOST) return null;
  return new Minio.Client({
    endPoint: MINIO_HOST,
    port: +MINIO_API_PORT,
    useSSL: false,
    accessKey: MINIO_ROOT_USER,
    secretKey: MINIO_ROOT_PASSWORD,
  });
}

async function ensureBuckets(minioClient: Minio.Client) {
  for (const bucket of [
    FINAL_COVERS_BUCKET,
    FINAL_AVATAR_BUCKET,
    FINAL_AUDIO_BUCKET,
  ]) {
    const exists = await minioClient.bucketExists(bucket);
    if (!exists) await minioClient.makeBucket(bucket);
  }
}

// ─── Image generation (covers + avatars) ─────────────────────────────────────

function generateGlitchNoiseBuffer(width: number, height: number): Buffer {
  const channels = 3;
  const buf = Buffer.alloc(width * height * channels);
  randomFillSync(buf);

  for (let y = 0; y < height; ) {
    const bandH = 1 + Math.floor(Math.random() * 24);
    if (Math.random() < 0.25) {
      const ch = Math.floor(Math.random() * channels);
      const shift = Math.floor(Math.random() * width * 0.15);
      for (let row = y; row < Math.min(y + bandH, height); row++) {
        for (let x = 0; x < width; x++) {
          const srcX = (x + shift) % width;
          const i = (row * width + x) * channels + ch;
          const srcI = (row * width + srcX) * channels + ch;
          buf[i] = Math.min(255, buf[srcI] + 60);
        }
      }
    }
    y += bandH;
  }

  for (let y = 0; y < height; y += 3) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels;
      buf[i] = Math.max(0, buf[i] - 35);
      buf[i + 1] = Math.max(0, buf[i + 1] - 35);
      buf[i + 2] = Math.max(0, buf[i + 2] - 35);
    }
  }

  return buf;
}

async function generateAndUploadImage(
  minioClient: Minio.Client,
  bucket: string,
  sizes: number[]
): Promise<{ id: string; urls: string[] }> {
  const id = randomUUID();
  const baseSize = 1500;

  const rawBuf = generateGlitchNoiseBuffer(baseSize, baseSize);
  const baseWebp = await sharp(rawBuf, {
    raw: { width: baseSize, height: baseSize, channels: 3 },
  })
    .webp({ quality: 80 })
    .toBuffer();

  await minioClient.putObject(bucket, `${id}-original.webp`, baseWebp);

  const sizeUrls = await Promise.all(
    sizes.map(async (size) => {
      const resized = await sharp(baseWebp)
        .resize(size, size, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();
      await minioClient.putObject(bucket, `${id}-x${size}.webp`, resized);
      return `${id}-x${size}`;
    })
  );

  return { id, urls: [`${id}-original`, ...sizeUrls] };
}

// ─── Audio ───────────────────────────────────────────────────────────────────

async function generateAndUploadAudio(
  minioClient: Minio.Client,
  noiseType: (typeof NOISE_TYPES)[number]
): Promise<{ audioId: string; duration: number } | null> {
  const audioId = randomUUID();
  const tmpDir = path.join(os.tmpdir(), `mirlo-seed-${audioId}`);

  try {
    await fsPromises.mkdir(tmpDir, { recursive: true });

    await new Promise<void>((resolve, reject) => {
      ffmpeg()
        .input(`anoisesrc=d=${NOISE_DURATION_SECS}:c=${noiseType}:r=48000`)
        .inputFormat("lavfi")
        .noVideo()
        .outputOptions([
          "-start_number",
          "0",
          "-hls_time",
          "10",
          "-hls_list_size",
          "0",
          "-hls_segment_filename",
          path.join(tmpDir, "segment-%03d.ts"),
          "-f",
          "hls",
        ])
        .audioChannels(2)
        .audioBitrate("320k")
        .audioFrequency(48000)
        .audioCodec("libmp3lame")
        .on("end", () => resolve())
        .on("error", (err: Error) => reject(err))
        .save(path.join(tmpDir, "playlist.m3u8"));
    });

    const files = await fsPromises.readdir(tmpDir);
    await Promise.all(
      files.map(async (file) => {
        const buffer = await fsPromises.readFile(path.join(tmpDir, file));
        await minioClient.putObject(
          FINAL_AUDIO_BUCKET,
          `${audioId}/${file}`,
          buffer
        );
      })
    );

    return { audioId, duration: NOISE_DURATION_SECS };
  } catch (err) {
    console.warn(
      `  ⚠ Audio generation failed (${noiseType} noise):`,
      err instanceof Error ? err.message : err
    );
    return null;
  } finally {
    await fsPromises
      .rm(tmpDir, { recursive: true, force: true })
      .catch(() => {});
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pickGenres(count = 2): string[] {
  const genres = new Set<string>();
  let attempts = 0;
  while (genres.size < count && attempts < count * 20) {
    genres.add(faker.music.genre().toLowerCase().replace(/\s+/g, "-"));
    attempts++;
  }
  return [...genres];
}

const TITLE_PATTERNS = [
  () => `${faker.word.adjective()} ${faker.word.noun()}`,
  () => `The ${faker.word.adjective()} ${faker.word.noun()}`,
  () => `${faker.word.noun()} of ${faker.word.noun()}`,
  () => faker.lorem.words(3),
  () => `${faker.word.adjective()} ${faker.lorem.word()}`,
];

function randomTitle(): string {
  return TITLE_PATTERNS[Math.floor(Math.random() * TITLE_PATTERNS.length)]();
}

function pastDate(daysAgo: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d;
}

// ─── Main seed ───────────────────────────────────────────────────────────────

export async function seedPublishedTrackGroups() {
  const artistResults = await Promise.all(
    ARTIST_SLUGS.map((slug) =>
      prisma.profile.findFirst({ where: { urlSlug: slug } })
    )
  );
  const artists = artistResults.filter(
    (a): a is NonNullable<typeof a> => a !== null
  );

  if (artists.length === 0) {
    console.log("No artists found, skipping published trackgroup seeding");
    return;
  }

  const minioClient = createMinioClient();
  if (!minioClient) {
    console.log("MINIO_HOST not set — covers and audio will be skipped");
  } else {
    await ensureBuckets(minioClient);

    for (const artist of artists) {
      const existing = await prisma.profileAvatar.findFirst({
        where: { artistId: artist.id },
      });
      if (existing) {
        console.log(`Avatar already exists for ${artist.name}, skipping`);
        continue;
      }
      try {
        const { id, urls } = await generateAndUploadImage(
          minioClient,
          FINAL_AVATAR_BUCKET,
          AVATAR_SIZES
        );
        await prisma.profileAvatar.create({
          data: {
            id,
            url: urls,
            originalFilename: `seed-avatar-${id}.webp`,
            artistId: artist.id,
          },
        });
        console.log(
          `Generated avatar for ${artist.name} (${urls.length} sizes)`
        );
      } catch (err) {
        console.warn(
          `  ⚠ Avatar generation failed for ${artist.name}:`,
          err instanceof Error ? err.message : err
        );
      }
    }
  }

  for (const artist of artists) {
    for (let i = 0; i < ALBUMS_PER_ARTIST; i++) {
      const daysAgo = 1 + Math.floor(Math.random() * 59);
      const releaseDate = pastDate(daysAgo);
      const publishedAt = new Date(releaseDate.getTime() + 1000 * 60 * 60);

      let title = randomTitle();
      let urlSlug = generateSlug(title);
      let clashes = true;
      for (let attempt = 0; attempt < 5; attempt++) {
        const clash = await prisma.trackGroup.findFirst({
          where: { urlSlug, artistId: artist.id },
        });
        if (!clash) {
          clashes = false;
          break;
        }
        title = randomTitle();
        urlSlug = generateSlug(title);
      }
      if (clashes) {
        console.log(
          `Could not find unique slug for ${artist.name} after 5 attempts, skipping`
        );
        continue;
      }

      try {
        const genres = pickGenres(1 + Math.floor(Math.random() * 3));
        const trackGroup = await prisma.trackGroup.create({
          data: {
            title,
            urlSlug,
            about: faker.lorem.paragraph(),
            publishedAt,
            releaseDate,
            isPublic: true,
            artist: { connect: { id: artist.id } },
            tags: {
              create: genres.map((genre) => ({
                tag: {
                  connectOrCreate: {
                    where: { tag: genre },
                    create: { tag: genre },
                  },
                },
              })),
            },
          },
        });
        console.log(
          `Created trackGroup "${title}" for ${artist.name} (id: ${trackGroup.id})`
        );

        if (minioClient) {
          try {
            const { id: coverId, urls } = await generateAndUploadImage(
              minioClient,
              FINAL_COVERS_BUCKET,
              COVER_SIZES
            );
            await prisma.trackGroupCover.create({
              data: {
                id: coverId,
                url: urls,
                originalFilename: `seed-cover-${coverId}.webp`,
                trackGroupId: trackGroup.id,
              },
            });
            console.log(`  → Cover uploaded (${urls.length} sizes)`);
          } catch (err) {
            console.warn(
              `  ⚠ Cover upload failed:`,
              err instanceof Error ? err.message : err
            );
          }
        }

        for (let t = 0; t < TRACKS_PER_ALBUM; t++) {
          const noiseType = NOISE_TYPES[t % NOISE_TYPES.length];
          const trackTitle = randomTitle();

          const track = await prisma.track.create({
            data: {
              order: t + 1,
              title: trackTitle,
              isPreview: true,
              trackGroupId: trackGroup.id,
            },
          });

          if (minioClient) {
            const audio = await generateAndUploadAudio(minioClient, noiseType);
            if (audio) {
              await prisma.trackAudio.create({
                data: {
                  id: audio.audioId,
                  trackId: track.id,
                  uploadState: "SUCCESS",
                  duration: audio.duration,
                  fileExtension: "mp3",
                  originalFilename: `seed-noise-${noiseType}.mp3`,
                },
              });
            }
          }
          console.log(
            `  ♪ Track ${t + 1}: "${trackTitle}"${minioClient ? ` (${noiseType} noise)` : ""}`
          );
        }
      } catch (err) {
        console.error(
          `❌ Error creating trackGroup "${title}" for ${artist.name}:`,
          err
        );
      }
    }
  }

  console.log(
    `Published trackgroup seeding complete (${artists.length * ALBUMS_PER_ARTIST} attempted).`
  );
}
