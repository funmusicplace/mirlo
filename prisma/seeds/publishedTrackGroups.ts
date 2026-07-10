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

// Fresh installs use the consolidated 3-bucket layout (see docs/hosting/object-storage.md).
const IMAGES_BUCKET = "mirlo-images";
const AUDIO_BUCKET = "mirlo-audio";
const COVER_PREFIX = "trackgroup-covers";
const AVATAR_PREFIX = "artist-avatars";

const COVER_SIZES = [1500, 1200, 960, 600, 300, 120, 60];
const AVATAR_SIZES = [1500, 1200, 960, 600, 300, 120, 60];

const NOISE_TYPES = ["white", "pink", "brown"] as const;
const NOISE_DURATION_SECS = 20;
const TRACKS_PER_ALBUM = 3;
const ALBUMS_PER_ARTIST = 5;

type NoiseType = (typeof NOISE_TYPES)[number];

/** ffmpeg once per noise type; uploads reuse files from disk to avoid OOM. */
const noiseFileCache = new Map<NoiseType, string>();

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

export function createMinioClient(): Minio.Client | null {
  if (!MINIO_HOST) return null;
  return new Minio.Client({
    endPoint: MINIO_HOST,
    port: +MINIO_API_PORT,
    useSSL: false,
    accessKey: MINIO_ROOT_USER,
    secretKey: MINIO_ROOT_PASSWORD,
  });
}

export async function ensureBuckets(minioClient: Minio.Client) {
  for (const bucket of [IMAGES_BUCKET, AUDIO_BUCKET]) {
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

export async function generateAndUploadImage(
  minioClient: Minio.Client,
  prefix: string,
  sizes: number[]
): Promise<{ id: string; urls: string[] }> {
  const id = randomUUID();
  // Seed covers don't need full 1500px; smaller base cuts sharp peak memory hard.
  const baseSize = 600;
  const seedSizes = sizes.filter((s) => s <= baseSize);

  const rawBuf = generateGlitchNoiseBuffer(baseSize, baseSize);
  const baseWebp = await sharp(rawBuf, {
    raw: { width: baseSize, height: baseSize, channels: 3 },
  })
    .webp({ quality: 70 })
    .toBuffer();

  await minioClient.putObject(
    IMAGES_BUCKET,
    `${prefix}/${id}-original.webp`,
    baseWebp
  );

  // Sequential resizes — parallel sharp pipelines spike memory enough to
  // get the seed process SIGKILL'd under Docker/cgroup limits.
  const sizeUrls: string[] = [];
  for (const size of seedSizes) {
    const resized = await sharp(baseWebp)
      .resize(size, size, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 70 })
      .toBuffer();
    await minioClient.putObject(
      IMAGES_BUCKET,
      `${prefix}/${id}-x${size}.webp`,
      resized
    );
    sizeUrls.push(`${id}-x${size}`);
  }

  return { id, urls: [`${id}-original`, ...sizeUrls] };
}

// ─── Audio ───────────────────────────────────────────────────────────────────

async function ensureNoiseFiles(noiseType: NoiseType): Promise<string | null> {
  const cached = noiseFileCache.get(noiseType);
  if (cached) return cached;

  const tmpDir = path.join(os.tmpdir(), `mirlo-seed-noise-${noiseType}`);
  try {
    await fsPromises.rm(tmpDir, { recursive: true, force: true });
    await fsPromises.mkdir(tmpDir, { recursive: true });

    await new Promise<void>((resolve, reject) => {
      ffmpeg()
        .input(`anoisesrc=d=${NOISE_DURATION_SECS}:c=${noiseType}:r=44100`)
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
        .audioBitrate("128k")
        .audioFrequency(44100)
        .audioCodec("libmp3lame")
        .on("end", () => resolve())
        .on("error", (err: Error) => reject(err))
        .save(path.join(tmpDir, "playlist.m3u8"));
    });

    noiseFileCache.set(noiseType, tmpDir);
    return tmpDir;
  } catch (err) {
    await fsPromises.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    console.warn(
      `  ⚠ Audio generation failed (${noiseType} noise):`,
      err instanceof Error ? err.message : err
    );
    return null;
  }
}

async function uploadCachedAudio(
  minioClient: Minio.Client,
  noiseType: NoiseType
): Promise<{ audioId: string; duration: number } | null> {
  const tmpDir = await ensureNoiseFiles(noiseType);
  if (!tmpDir) return null;

  const audioId = randomUUID();
  try {
    const files = await fsPromises.readdir(tmpDir);
    for (const file of files) {
      const buffer = await fsPromises.readFile(path.join(tmpDir, file));
      await minioClient.putObject(AUDIO_BUCKET, `${audioId}/${file}`, buffer);
    }
    return { audioId, duration: NOISE_DURATION_SECS };
  } catch (err) {
    console.warn(
      `  ⚠ Audio generation failed (${noiseType} noise):`,
      err instanceof Error ? err.message : err
    );
    return null;
  }
}

async function cleanupNoiseFileCache() {
  for (const tmpDir of noiseFileCache.values()) {
    await fsPromises.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
  noiseFileCache.clear();
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pickGenres(count = 2): string[] {
  const genres = new Set<string>();
  // faker.music.genre() has a small pool; retries avoid duplicate tag rows
  // which violate TrackGroupTag's @@unique([trackGroupId, tagId]).
  for (let attempt = 0; attempt < count * 10 && genres.size < count; attempt++) {
    genres.add(faker.music.genre().toLowerCase().replace(/\s+/g, "-"));
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

  try {
    await seedPublishedTrackGroupsInner(artists);
  } finally {
    await cleanupNoiseFileCache();
  }
}

async function seedPublishedTrackGroupsInner(
  artists: { id: number; name: string }[]
) {
  const minioClient = createMinioClient();
  if (!minioClient) {
    console.log("MINIO_HOST not set — covers and audio will be skipped");
  } else {
    await ensureBuckets(minioClient);

    for (const artist of artists) {
      const existing = await prisma.profileAvatar.findFirst({
        where: { profileId: artist.id },
      });
      if (existing) {
        console.log(`Avatar already exists for ${artist.name}, skipping`);
        continue;
      }
      try {
        const { id, urls } = await generateAndUploadImage(
          minioClient,
          AVATAR_PREFIX,
          AVATAR_SIZES
        );
        await prisma.profileAvatar.create({
          data: {
            id,
            url: urls,
            originalFilename: `seed-avatar-${id}.webp`,
            profileId: artist.id,
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
          where: { urlSlug, profileId: artist.id },
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
            profile: { connect: { id: artist.id } },
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
              COVER_PREFIX,
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
            const audio = await uploadCachedAudio(minioClient, noiseType);
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
