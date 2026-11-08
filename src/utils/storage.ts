import fs from "fs";
import { Readable } from "stream";

import {
  S3Client,
  CopyObjectCommand,
  CreateBucketCommand,
  HeadBucketCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  PutObjectCommand,
  PutBucketPolicyCommand,
  PutBucketCorsCommand,
  HeadObjectCommand,
  HeadObjectCommandOutput,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NodeHttpHandler } from "@smithy/node-http-handler";
import contentDisposition from "content-disposition";
import { chunk } from "lodash";
import { Logger } from "winston";

import logger from "../logger";

// Backend-agnostic object storage helpers: Garage in development, any
// S3-compatible provider (Backblaze B2 in production) via the AWS SDK.
// The filename is historical — nothing here is MinIO-specific from the
// caller's point of view. Bucket layout is documented in
// docs/hosting/object-storage.md.

export const instanceLogoPrefix = "instance-logos";
export const rootImagePrefix = "";

export type BucketConfig = { prefix: string };
export const DEFAULT_BUCKET_CONFIG: BucketConfig = { prefix: "" };

export const isBucketConfig = (value: unknown): value is BucketConfig =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as BucketConfig).prefix === "string";

// Per-image-type routing table.
// prefix: key prefix within the images bucket (empty for the generic
//         "image" type, which sits at the bucket root).
// queue: whether to add a BullMQ optimize-image job after upload.
const imageTypeBuckets = {
  postImage: { prefix: rootImagePrefix, queue: false },
  instanceLogo: { prefix: instanceLogoPrefix, queue: false },
  image: { prefix: rootImagePrefix, queue: true },
};
export type ImageType = keyof typeof imageTypeBuckets;

let _bucketConfig: BucketConfig = DEFAULT_BUCKET_CONFIG;
const _ensuredBuckets = new Set<string>();

export const setBucketConfig = (config: BucketConfig) => {
  _bucketConfig = config;
  _ensuredBuckets.clear();
};

const ensureBucketCached = async (bucket: string, makePublic?: boolean) => {
  if (!_ensuredBuckets.has(bucket)) {
    await createBucketIfNotExists(bucket, logger, { makePublic });
    _ensuredBuckets.add(bucket);
  }
};

export const getImagesBucket = (): string =>
  `${_bucketConfig.prefix}mirlo-images`;

export const getAudioBucket = (): string =>
  `${_bucketConfig.prefix}mirlo-audio`;

export const getDownloadsBucket = (): string =>
  `${_bucketConfig.prefix}mirlo-downloads`;

const {
  LOCAL_S3_HOST = "",
  LOCAL_S3_PUBLIC_HOST = "",
  LOCAL_S3_PUBLIC_PORT = "",
  LOCAL_S3_USER = "",
  LOCAL_S3_PASSWORD = "",
  S3_ACCESS_KEY_ID = "",
  S3_SECRET_ACCESS_KEY = "",
  S3_ENDPOINT: RAW_S3_ENDPOINT = "https://s3.us-east-005.backblazeb2.com",
  S3_REGION = "us-east-005",
  LOCAL_S3_API_PORT = 9000,
} = process.env;

export const S3_ENDPOINT = RAW_S3_ENDPOINT;

/**
 * Choose what backend storage to use. Inferred when things are configured, but
 * can be overwritten by passed explict string.
 * @param explicit
 * @param hasS3Credentials
 * @returns
 */
export const resolveBackendStorage = (
  explicit: string | undefined = process.env.STORAGE_BACKEND,
  hasS3Credentials: boolean = Boolean(S3_ACCESS_KEY_ID && S3_SECRET_ACCESS_KEY)
): "minio" | "backblaze" => {
  const normalized = explicit?.trim().toLowerCase();
  if (normalized === "minio") return "minio";
  if (normalized === "s3" || normalized === "backblaze") return "backblaze";
  if (normalized) {
    throw new Error(
      `Invalid STORAGE_BACKEND "${explicit}" — expected "minio", "s3" or "backblaze"`
    );
  }
  return hasS3Credentials ? "backblaze" : "minio";
};

export const backendStorage: "minio" | "backblaze" = resolveBackendStorage();

const localS3Config = {
  region: "us-east-1",
  credentials: {
    accessKeyId: LOCAL_S3_USER,
    secretAccessKey: LOCAL_S3_PASSWORD,
  },
  forcePathStyle: true,
  requestChecksumCalculation: "WHEN_REQUIRED" as const,
};

export const localS3Client =
  backendStorage === "minio" && LOCAL_S3_HOST
    ? new S3Client({
        ...localS3Config,
        endpoint: `http://${LOCAL_S3_HOST}:${LOCAL_S3_API_PORT}`,
      })
    : undefined;

export const localS3PublicClient =
  backendStorage === "minio" && LOCAL_S3_PUBLIC_HOST
    ? new S3Client({
        ...localS3Config,
        endpoint: `http://${LOCAL_S3_PUBLIC_HOST}:${
          LOCAL_S3_PUBLIC_PORT || LOCAL_S3_API_PORT
        }`,
      })
    : undefined;

export const backblazeClient =
  backendStorage === "backblaze"
    ? new S3Client({
        region: S3_REGION,
        endpoint: S3_ENDPOINT,
        credentials: {
          accessKeyId: S3_ACCESS_KEY_ID,
          secretAccessKey: S3_SECRET_ACCESS_KEY,
        },
        // Path-style (endpoint/bucket/key) rather than virtual-hosted-style
        // (bucket.endpoint/key). Virtual-hosted style depends on the provider
        // having wildcard DNS/TLS for arbitrary bucket-name subdomains, which
        // isn't reliable on every S3-compatible provider and has caused
        // requests to hang indefinitely on newly-created buckets.
        forcePathStyle: true,
        responseChecksumValidation: "WHEN_REQUIRED",
        requestChecksumCalculation: "WHEN_REQUIRED",
        maxAttempts: 4,
        // Without explicit timeouts, a stalled connection (no response, no
        // error) hangs forever — maxAttempts only retries attempts that
        // actually fail, so a silent stall never gets retried at all.
        requestHandler: new NodeHttpHandler({
          connectionTimeout: 10_000,
          requestTimeout: 30_000,
        }),
      })
    : undefined;

// Buckets holding processed images are fetched directly by browsers (see
// docs/hosting/object-storage.md) and so need public read access.
const publicReadPolicy = (bucket: string) =>
  JSON.stringify({
    Version: "2012-10-17",
    Statement: [
      {
        Sid: "PublicReadGetObject",
        Effect: "Allow",
        Principal: "*",
        Action: "s3:GetObject",
        Resource: `arn:aws:s3:::${bucket}/*`,
      },
    ],
  });

// The browser PUTs directly to a presigned URL for track audio uploads (and
// GETs directly for some flows), which is a cross-origin request.
const corsConfiguration = () => ({
  CORSRules: [
    {
      AllowedOrigins: ["*"],
      AllowedMethods: ["GET", "PUT", "POST", "HEAD"],
      AllowedHeaders: ["*"],
      ExposeHeaders: ["ETag"],
      MaxAgeSeconds: 3000,
    },
  ],
});

export const storageClient: S3Client | undefined =
  backendStorage === "backblaze" ? backblazeClient : localS3Client;

const storageS3Client = () => {
  if (!storageClient) {
    throw new Error(`${backendStorage}: no S3 client`);
  }
  return storageClient;
};

const applyCorsPolicy = async (bucket: string) => {
  try {
    await storageS3Client().send(
      new PutBucketCorsCommand({
        Bucket: bucket,
        CORSConfiguration: corsConfiguration(),
      })
    );
    logger.info(`${backendStorage}: set CORS policy on bucket: ${bucket}`);
  } catch (e) {
    if (e instanceof Error && e.message.includes("B2 Native CORS rules")) {
      logger.warn(
        `${backendStorage}: bucket ${bucket} already has native B2 CORS rules; skipping S3 CORS update`
      );
      return;
    }
    logger.error(
      `${backendStorage}: failed to set CORS policy on bucket ${bucket}`
    );
    logger.error(e);
  }
};

const applyPublicReadPolicy = async (bucket: string) => {
  try {
    await storageS3Client().send(
      new PutBucketPolicyCommand({
        Bucket: bucket,
        Policy: publicReadPolicy(bucket),
      })
    );
    logger.info(
      `${backendStorage}: set public-read policy on bucket: ${bucket}`
    );
  } catch (e) {
    // B2 doesn't implement PutBucketPolicy so this isn't actionable and
    // shouldn't be dumped in the error logs.

    if (
      e instanceof Error &&
      e.message.includes("This API call is not supported")
    ) {
      logger.warn(
        `${backendStorage}: bucket ${bucket} policy API not supported; make sure it's set to public via your provider's console`
      );
      return;
    }
    logger.error(
      `${backendStorage}: failed to set public-read policy on bucket ${bucket} — ` +
        `it may need to be made public manually via your provider's console`
    );
    logger.error(e instanceof Error ? e.message : e);
  }
};

const isNotFound = (e: unknown) => {
  const error = e as {
    name?: string;
    $metadata?: { httpStatusCode?: number };
  };
  return (
    error.$metadata?.httpStatusCode === 404 ||
    error.name === "NotFound" ||
    error.name === "NoSuchKey" ||
    error.name === "NoSuchBucket"
  );
};

export const statFile = async (
  bucket: string,
  filename: string
): Promise<HeadObjectCommandOutput | undefined> => {
  try {
    return await storageS3Client().send(
      new HeadObjectCommand({ Bucket: bucket, Key: filename })
    );
  } catch (e) {
    if (!isNotFound(e)) {
      logger.error(
        `${backendStorage}: error fetching file stat: ${bucket}/${filename}`
      );
      logger.error(e instanceof Error ? e.message : e);
    }
    return undefined;
  }
};

export interface FileMeta {
  contentType?: string;
  contentLength?: number;
  lastModified?: Date;
  etag?: string;
}

const normalizeStatToMeta = (
  stat?: HeadObjectCommandOutput
): FileMeta | null =>
  stat
    ? {
        contentType: stat.ContentType,
        contentLength: stat.ContentLength,
        lastModified: stat.LastModified,
        etag: stat.ETag,
      }
    : null;

export const createBucketIfNotExists = async (
  bucket: string,
  logger?: Logger,
  options?: { makePublic?: boolean }
) => {
  const client = storageS3Client();
  logger?.info(`${backendStorage}: checking if a bucket exists in: ${bucket}`);
  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
  } catch {
    logger?.info(
      `${backendStorage}: bucket ${bucket} doesn't exist yet, creating it`
    );
    await client.send(new CreateBucketCommand({ Bucket: bucket }));
  }

  if (options?.makePublic && backendStorage === "backblaze") {
    await applyPublicReadPolicy(bucket);
  }
  await applyCorsPolicy(bucket);

  return true;
};

export const getPresignedUploadUrl = async (
  bucket: string,
  fileName: string,
  options?: {
    expiresInSeconds?: number;
    contentType?: string;
    contentLength?: number;
  }
): Promise<string | null> => {
  const { expiresInSeconds = 3600, contentType, contentLength } = options ?? {};
  await createBucketIfNotExists(bucket);

  const client =
    backendStorage === "backblaze" ? backblazeClient : localS3PublicClient;

  if (!client) {
    if (backendStorage === "backblaze") {
      throw new Error("Backblaze client is not initialized");
    }
    return null;
  }

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: fileName,
    ...(contentType !== undefined ? { ContentType: contentType } : {}),
    ...(contentLength !== undefined ? { ContentLength: contentLength } : {}),
  });

  // Force content-type and content-length into the signature so the declared
  // values are enforced.
  const signableHeaders = new Set(["host"]);
  if (contentType !== undefined) signableHeaders.add("content-type");
  if (contentLength !== undefined) signableHeaders.add("content-length");

  return getSignedUrl(client, command, {
    expiresIn: expiresInSeconds,
    signableHeaders,
  });
};

export const getPresignedDownloadUrl = async (
  bucket: string,
  filename: string,
  options?: {
    expiresInSeconds?: number;
    downloadFilename?: string;
    contentType?: string;
  }
): Promise<string | null> => {
  const expiresInSeconds = options?.expiresInSeconds ?? 60 * 15;
  const stat = await statFile(bucket, filename);

  const client =
    backendStorage === "backblaze" ? backblazeClient : localS3PublicClient;

  if (!stat || !client) {
    return null;
  }

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: filename,
    ...(options?.downloadFilename
      ? {
          ResponseContentDisposition: contentDisposition(
            options.downloadFilename,
            { type: "attachment" }
          ),
        }
      : {}),
    ...(options?.contentType
      ? { ResponseContentType: options.contentType }
      : {}),
  });

  return getSignedUrl(client, command, { expiresIn: expiresInSeconds });
};

export const uploadWrapper = async (
  bucket: string,
  fileName: string,
  fileStream: Readable | Buffer,
  options?: { contentType?: string; cacheControl?: string }
) => {
  const client = storageS3Client();
  logger.info(
    `${backendStorage}: uploading fileStream|buffer: ${bucket}/${fileName}`
  );
  const params = {
    Bucket: bucket,
    Key: fileName,
    Body: fileStream,
    ContentType: options?.contentType,
    CacheControl: options?.cacheControl,
  };
  if (fileStream instanceof Buffer) {
    await client.send(new PutObjectCommand(params));
  } else {
    await new Upload({ client, params }).done();
  }
  logger.info(
    `${backendStorage}: done uploading filestream|buffer: ${bucket}/${fileName}`
  );
};

export const removeObjectFromStorage = async (
  bucket: string,
  fileName: string
) => {
  logger.info(`${backendStorage}: removing fileStream: ${bucket}/${fileName}`);
  await storageS3Client().send(
    new DeleteObjectCommand({ Bucket: bucket, Key: fileName })
  );
};

/**
 * Server-side copy: the bytes never leave the storage provider, and the
 * source's metadata (content type, cache control) carries over unless a
 * contentType is given, which replaces the type and keeps the cache control.
 * Both B2 and Garage implement CopyObject.
 */
export const copyObjectInStorage = async (
  fromBucket: string,
  fromKey: string,
  toBucket: string,
  toKey: string,
  options?: { contentType?: string }
) => {
  const client = storageS3Client();
  logger.info(
    `${backendStorage}: copying ${fromBucket}/${fromKey} to ${toBucket}/${toKey}`
  );
  const replaceMetadata = options?.contentType
    ? {
        MetadataDirective: "REPLACE" as const,
        ContentType: options.contentType,
        CacheControl: (
          await client.send(
            new HeadObjectCommand({ Bucket: fromBucket, Key: fromKey })
          )
        ).CacheControl,
      }
    : {};
  await client.send(
    new CopyObjectCommand({
      Bucket: toBucket,
      Key: toKey,
      // CopySource is a URL path, so each key segment has to be encoded.
      CopySource: [fromBucket, ...fromKey.split("/")]
        .map(encodeURIComponent)
        .join("/"),
      ...replaceMetadata,
    })
  );
};

const forEachObjectPage = async (
  bucket: string,
  callback: (keys: string[]) => Promise<void>,
  options: { prefix?: string; delimiter?: string } = {}
) => {
  const client = storageS3Client();
  let continuationToken: string | undefined;
  do {
    const page = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: options.prefix,
        Delimiter: options.delimiter,
        ContinuationToken: continuationToken,
      })
    );
    await callback([
      ...(page.CommonPrefixes ?? []).flatMap((p) =>
        p.Prefix ? [p.Prefix] : []
      ),
      ...(page.Contents ?? []).flatMap((c) => (c.Key ? [c.Key] : [])),
    ]);
    continuationToken = page.IsTruncated
      ? page.NextContinuationToken
      : undefined;
  } while (continuationToken);
};

export const getBufferFromStorage = async (
  bucket: string,
  filename: string
) => {
  logger.info(`${backendStorage}: getting buffer: ${bucket}/${filename}`);
  const result = await storageS3Client().send(
    new GetObjectCommand({ Bucket: bucket, Key: filename })
  );
  const bytes = await result.Body?.transformToByteArray();
  return {
    buffer: bytes
      ? Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength)
      : undefined,
    etag: result.ETag,
  };
};

export const getFile = async (
  bucket: string,
  remoteFileName: string,
  localFilePath: string
) => {
  logger.info(
    `${backendStorage}: getting file: ${bucket}/${remoteFileName} storing at ${localFilePath}`
  );
  const result = await storageS3Client().send(
    new GetObjectCommand({ Bucket: bucket, Key: remoteFileName })
  );
  if (!(result.Body instanceof Readable)) {
    throw new Error(
      `${backendStorage}: no readable body for ${bucket}/${remoteFileName}`
    );
  }
  await fs.promises.writeFile(localFilePath, result.Body);
};

export const getReadStream = async (bucket: string, remoteFileName: string) => {
  logger.info(`${backendStorage}: getting stream: ${bucket}/${remoteFileName}`);
  const result = await storageS3Client().send(
    new GetObjectCommand({ Bucket: bucket, Key: remoteFileName })
  );
  if (result.Body instanceof Readable) {
    return result.Body;
  }
};

export const removeObjectsFromBucket = async (
  bucketName: string,
  prefix: string
) => {
  const keys: string[] = [];
  await forEachObjectPage(
    bucketName,
    async (page) => {
      keys.push(...page);
    },
    { prefix }
  );

  await Promise.all(
    keys.map((key) => removeObjectFromStorage(bucketName, key))
  );
};

// ─── Domain storage operations ────────────────────────────────────────────────
// All bucket selection and key construction lives here.
// Call sites express intent; this layer handles the routing.

// ── Audio ─────────────────────────────────────────────────────────────────────

const audioIncomingKey = (audioId: string) => `incoming/${audioId}`;

export const uploadIncomingAudio = async (
  audioId: string,
  stream: Readable
) => {
  const bucket = getAudioBucket();
  await ensureBucketCached(bucket);
  return uploadWrapper(bucket, audioIncomingKey(audioId), stream);
};

export const downloadIncomingAudio = (audioId: string, destPath: string) =>
  getFile(getAudioBucket(), audioIncomingKey(audioId), destPath);

export const getAudioUploadUrl = (audioId: string) =>
  getPresignedUploadUrl(getAudioBucket(), audioIncomingKey(audioId));

export const removeIncomingAudio = (audioId: string) =>
  removeObjectFromStorage(getAudioBucket(), audioIncomingKey(audioId));

export const downloadOriginalAudio = (
  audioId: string,
  ext: string,
  destPath: string
) => getFile(getAudioBucket(), `${audioId}/original.${ext}`, destPath);

export const presignOriginalAudio = (audioId: string, ext: string) =>
  getPresignedDownloadUrl(getAudioBucket(), `${audioId}/original.${ext}`);

export const streamOriginalAudio = (audioId: string, ext: string) =>
  getReadStream(getAudioBucket(), `${audioId}/original.${ext}`);

export const statAudioSegment = (audioId: string, segment: string) =>
  statFile(getAudioBucket(), `${audioId}/${segment}`);

export const getAudioSegmentBufferIfExists = async (
  audioId: string,
  segment: string
): Promise<Buffer | undefined> => {
  if (!(await statAudioSegment(audioId, segment))) return undefined;
  const { buffer } = await getBufferFromStorage(
    getAudioBucket(),
    `${audioId}/${segment}`
  );
  return buffer;
};

export const uploadAudioHlsFile = async (
  audioId: string,
  filename: string,
  stream: Readable
) => {
  const bucket = getAudioBucket();
  await ensureBucketCached(bucket);
  return uploadWrapper(bucket, `${audioId}/${filename}`, stream);
};

export const removeAudioFiles = async (audioId: string) => {
  await Promise.all([
    removeObjectsFromBucket(getAudioBucket(), audioId),
    removeIncomingAudio(audioId),
  ]);
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const forEachStoredAudioIdPage = async (
  callback: (audioIds: string[]) => Promise<void>
) => {
  const listings = [
    {
      bucket: getAudioBucket(),
      prefix: audioIncomingKey(""),
    },
    { bucket: getAudioBucket(), prefix: "" },
  ];
  for (const { bucket, prefix } of listings) {
    await forEachObjectPage(
      bucket,
      (keys) =>
        callback(
          keys
            .map((key) => key.slice(prefix.length).split("/")[0])
            .filter((audioId) => uuidPattern.test(audioId))
        ),
      { prefix, delimiter: "/" }
    );
  }
};

// ── Images ────────────────────────────────────────────────────────────────────

const imageContentTypes: Record<string, string> = {
  webp: "image/webp",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  avif: "image/avif",
  ico: "image/x-icon",
  svg: "image/svg+xml",
};

export const imageContentType = (key: string): string | undefined =>
  imageContentTypes[key.split(".").pop()?.toLowerCase() ?? ""];

export const getImagePrefix = (imageType: ImageType): string =>
  imageTypeBuckets[imageType].prefix;

export const imageTypeUsesQueue = (imageType: ImageType): boolean =>
  imageTypeBuckets[imageType].queue;

const keyPrefixPath = (prefix: string) => (prefix ? `${prefix}/` : "");

const imageKeyPrefix = (imageType: ImageType) =>
  keyPrefixPath(getImagePrefix(imageType));

export const storedImagePrefix = (image: { keyPrefix: string | null }) =>
  image.keyPrefix ?? rootImagePrefix;

const storedImageKey = (
  image: { keyPrefix: string | null },
  fileName: string
) => `${keyPrefixPath(storedImagePrefix(image))}${fileName}`;

const incomingImageKey = (imageType: ImageType, fileName: string) =>
  `${imageKeyPrefix(imageType)}${fileName}`;

export const uploadIncomingImageByType = async (
  imageType: ImageType,
  fileName: string,
  stream: Readable,
  options?: { contentType?: string }
) => {
  const bucket = getImagesBucket();
  await ensureBucketCached(bucket, true);
  return uploadWrapper(
    bucket,
    incomingImageKey(imageType, fileName),
    stream,
    options
  );
};

export const downloadIncomingImageByType = (
  imageType: ImageType,
  imageId: string
) => {
  return getBufferFromStorage(
    getImagesBucket(),
    incomingImageKey(imageType, imageId)
  );
};

export const uploadOptimizedImageByType = async (
  imageType: ImageType,
  fileName: string,
  buffer: Buffer,
  options?: { contentType?: string; cacheControl?: string }
) => {
  const bucket = getImagesBucket();
  await ensureBucketCached(bucket, true);
  return uploadWrapper(
    bucket,
    `${imageKeyPrefix(imageType)}${fileName}`,
    buffer,
    options
  );
};

export const removeIncomingImageByType = (
  imageType: ImageType,
  imageId: string
) => {
  return removeObjectFromStorage(
    getImagesBucket(),
    incomingImageKey(imageType, imageId)
  );
};

export const removeImagesByType = (imageType: ImageType, imageId: string) =>
  removeObjectsFromBucket(
    getImagesBucket(),
    `${imageKeyPrefix(imageType)}${imageId}`
  );

export const removeStoredImage = (image: {
  id: string;
  keyPrefix: string | null;
}) =>
  removeObjectsFromBucket(getImagesBucket(), storedImageKey(image, image.id));

export const fixStoredImageContentTypes = async () => {
  const summary = { checked: 0, fixed: 0, failed: 0 };
  const client = storageS3Client();
  const bucket = getImagesBucket();

  await forEachObjectPage(bucket, async (keys) => {
    const images = keys.filter(
      (key) => !key.startsWith("incoming/") && imageContentType(key)
    );
    for (const batch of chunk(images, 10)) {
      await Promise.all(
        batch.map(async (key) => {
          const contentType = imageContentType(key)!;
          try {
            const head = await client.send(
              new HeadObjectCommand({ Bucket: bucket, Key: key })
            );
            summary.checked += 1;
            if (head.ContentType === contentType) return;
            await copyObjectInStorage(bucket, key, bucket, key, {
              contentType,
            });
            summary.fixed += 1;
          } catch (e) {
            logger.error(
              `${backendStorage}: couldn't fix content type of ${bucket}/${key}`,
              e
            );
            summary.failed += 1;
          }
        })
      );
    }
  });
  return summary;
};

export const getCoverBuffer = (
  cover: { id: string; keyPrefix: string | null },
  ext: "webp" | "jpg"
) =>
  getBufferFromStorage(
    getImagesBucket(),
    storedImageKey(cover, `${cover.id}-x1500.${ext}`)
  );

// ── Downloadable content ──────────────────────────────────────────────────────

const contentKey = (id: string) => `content/${id}`;

export const getDownloadableContentUploadUrl = (
  id: string,
  options: { contentType: string; contentLength: number }
) => getPresignedUploadUrl(getDownloadsBucket(), contentKey(id), options);

export const statDownloadableContent = (id: string) =>
  statFile(getDownloadsBucket(), contentKey(id));

export const getDownloadableContentMeta = async (
  id: string
): Promise<FileMeta | null> => {
  const stat = await statDownloadableContent(id);
  return normalizeStatToMeta(stat);
};

export const getDownloadableContentBuffer = (id: string) =>
  getBufferFromStorage(getDownloadsBucket(), contentKey(id));

export const getDownloadableContentReadStream = (id: string) =>
  getReadStream(getDownloadsBucket(), contentKey(id));

export const removeDownloadableContent = (id: string) =>
  removeObjectsFromBucket(getDownloadsBucket(), contentKey(id));

// ── Zips ──────────────────────────────────────────────────────────────────────

const zipTypeFolder = (type: "track" | "trackGroup") =>
  type === "track" ? "track/" : "trackgroup/";

// The trailing slash keeps id 12 from matching 123 when used as a prefix.
const zipFolder = (type: "track" | "trackGroup", id: number) =>
  `${zipTypeFolder(type)}${id}/`;

export const zipRootPath = (type: "track" | "trackGroup") =>
  `${getDownloadsBucket()}/${zipTypeFolder(type)}`.replace(/\/$/, "");

const zipKey = (type: "track" | "trackGroup", id: number, format: string) =>
  `${zipFolder(type, id)}${format}.zip`;

export const statZip = (
  type: "track" | "trackGroup",
  id: number,
  format: string
) => statFile(getDownloadsBucket(), zipKey(type, id, format));

export const zipExists = async (
  type: "track" | "trackGroup",
  id: number,
  format: string
): Promise<boolean> => !!(await statZip(type, id, format));

export const streamZip = (
  type: "track" | "trackGroup",
  id: number,
  format: string
) => getReadStream(getDownloadsBucket(), zipKey(type, id, format));

export const presignZip = (
  type: "track" | "trackGroup",
  id: number,
  format: string,
  options?: Parameters<typeof getPresignedDownloadUrl>[2]
) =>
  getPresignedDownloadUrl(
    getDownloadsBucket(),
    zipKey(type, id, format),
    options
  );

export const uploadZip = async (
  type: "track" | "trackGroup",
  id: number,
  format: string,
  stream: Readable
) => {
  const bucket = getDownloadsBucket();
  await ensureBucketCached(bucket);
  return uploadWrapper(bucket, zipKey(type, id, format), stream);
};

// Removes every cached format of a zip.
export const removeZips = (type: "track" | "trackGroup", id: number) =>
  removeObjectsFromBucket(getDownloadsBucket(), zipFolder(type, id));

export const removeAllZips = (type: "track" | "trackGroup") =>
  removeObjectsFromBucket(getDownloadsBucket(), zipTypeFolder(type));

export const currentBuckets = () => [
  getImagesBucket(),
  getAudioBucket(),
  getDownloadsBucket(),
];

export const bucketExists = async (bucket: string): Promise<boolean> => {
  if (!storageClient) return false;
  try {
    await storageClient.send(new HeadBucketCommand({ Bucket: bucket }));
    return true;
  } catch (e) {
    if (isNotFound(e)) return false;
    throw e;
  }
};

export const ensureAllBucketsExist = async () => {
  await Promise.all(
    currentBuckets().map((b) =>
      ensureBucketCached(b, b === getImagesBucket()).catch((e) => {
        logger.error(`Failed to eagerly create bucket ${b}`);
        logger.error(e);
      })
    )
  );
};
