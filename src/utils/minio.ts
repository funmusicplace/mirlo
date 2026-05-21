import fs from "fs";
import { Readable } from "stream";

import {
  S3Client,
  CreateBucketCommand,
  HeadBucketCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  PutObjectCommand,
  HeadObjectCommand,
  HeadObjectCommandOutput,
  ListObjectsCommand,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import contentDisposition from "content-disposition";
import { Client, BucketItem } from "minio";
import * as Minio from "minio";
import { Logger } from "winston";

import logger from "../logger";

const s3UniquePrefix = "";

export const incomingArtistBackgroundBucket =
  s3UniquePrefix + "incoming-artist-banners";
export const finalArtistBackgroundBucket = s3UniquePrefix + "artist-banners";

export const incomingArtistAvatarBucket =
  s3UniquePrefix + "incoming-artist-avatars";
export const finalArtistAvatarBucket = s3UniquePrefix + "artist-avatars";

export const incomingUserAvatarBucket =
  s3UniquePrefix + "incoming-user-avatars";
export const finalUserAvatarBucket = s3UniquePrefix + "mirlo-user-avatars";

export const incomingUserBannerBucket =
  s3UniquePrefix + "incoming-user-banners";
export const finalUserBannerBucket = s3UniquePrefix + "mirlo-user-banners";

export const incomingCoversBucket = s3UniquePrefix + "incoming-covers";
export const finalCoversBucket = s3UniquePrefix + "trackgroup-covers";

export const incomingMerchImageBucket =
  s3UniquePrefix + "incoming-merch-images";
export const finalMerchImageBucket = s3UniquePrefix + "merch-images";

export const finalPostImageBucket = s3UniquePrefix + "post-images";

export const incomingAudioBucket = s3UniquePrefix + "incoming-track-audio";
export const finalAudioBucket = s3UniquePrefix + "track-audio";

export const trackGroupFormatBucket = s3UniquePrefix + "trackgroup-format";
export const trackFormatBucket = s3UniquePrefix + "track-format";

export const downloadableContentBucket =
  s3UniquePrefix + "mirlo-downloadable-content";
export const incomingImageBucket = s3UniquePrefix + "incoming-mirlo-images";
export const finalImageBucket = s3UniquePrefix + "mirlo-images";

// Consolidated bucket config (Phase 1 self-hosting support).
// null = legacy mode: use per-type bucket constants above (for existing installs).
// Set = consolidated mode: 3 buckets with path prefixes (for new installs).
export type BucketConfig = { prefix: string };

// Per-image-type routing table.
// incoming: legacy bucket for uploads before optimization; final: legacy bucket after.
// prefix: path prefix within mirlo-images in consolidated mode (= final bucket name, or
//         undefined for the generic "image" type which sits at the bucket root).
// queue: whether to add a BullMQ optimize-image job after upload.
const imageTypeBuckets = {
  artistAvatar: {
    incoming: incomingArtistAvatarBucket,
    final: finalArtistAvatarBucket,
    prefix: finalArtistAvatarBucket as string | undefined,
    queue: true,
  },
  artistBackground: {
    incoming: incomingArtistBackgroundBucket,
    final: finalArtistBackgroundBucket,
    prefix: finalArtistBackgroundBucket as string | undefined,
    queue: true,
  },
  userAvatar: {
    incoming: incomingArtistAvatarBucket,
    final: finalUserAvatarBucket,
    prefix: finalUserAvatarBucket as string | undefined,
    queue: true,
  },
  userBanner: {
    incoming: incomingUserBannerBucket,
    final: finalUserBannerBucket,
    prefix: finalUserBannerBucket as string | undefined,
    queue: true,
  },
  trackGroupCover: {
    incoming: incomingCoversBucket,
    final: finalCoversBucket,
    prefix: finalCoversBucket as string | undefined,
    queue: true,
  },
  merch: {
    incoming: incomingMerchImageBucket,
    final: finalMerchImageBucket,
    prefix: finalMerchImageBucket as string | undefined,
    queue: true,
  },
  postImage: {
    incoming: finalPostImageBucket,
    final: finalPostImageBucket,
    prefix: finalPostImageBucket as string | undefined,
    queue: false,
  },
  image: {
    incoming: incomingImageBucket,
    final: finalImageBucket,
    prefix: undefined as string | undefined,
    queue: true,
  },
};
export type ImageType = keyof typeof imageTypeBuckets;

let _bucketConfig: BucketConfig | null = null;
const _ensuredBuckets = new Set<string>();

export const setBucketConfig = (config: BucketConfig | null) => {
  _bucketConfig = config;
  _ensuredBuckets.clear();
};

const ensureBucketCached = async (bucket: string) => {
  if (!_ensuredBuckets.has(bucket)) {
    await createBucketIfNotExists(bucket, logger);
    _ensuredBuckets.add(bucket);
  }
};

const isConsolidatedMode = (): boolean => _bucketConfig !== null;

export const getImagesBucket = (legacyFallback: string): string =>
  _bucketConfig ? `${_bucketConfig.prefix}mirlo-images` : legacyFallback;

export const getAudioBucket = (
  legacyFallback: string = finalAudioBucket
): string =>
  _bucketConfig ? `${_bucketConfig.prefix}mirlo-audio` : legacyFallback;

export const getDownloadsBucket = (legacyFallback: string): string =>
  _bucketConfig ? `${_bucketConfig.prefix}mirlo-downloads` : legacyFallback;

const {
  MINIO_HOST = "",
  MINIO_PUBLIC_HOST = "",
  MINIO_PUBLIC_PORT = "",
  MINIO_ROOT_USER = "",
  MINIO_ROOT_PASSWORD = "",
  S3_ACCESS_KEY_ID = "",
  S3_SECRET_ACCESS_KEY = "",
  S3_ENDPOINT = "https://s3.us-east-005.backblazeb2.com",
  S3_REGION = "us-east-005",
  MINIO_API_PORT = 9000,
  NODE_ENV,
} = process.env;

export const backendStorage: "minio" | "backblaze" =
  NODE_ENV === "production" ? "backblaze" : "minio";

// and access keys as shown below.
export const minioClient =
  backendStorage === "minio" && MINIO_HOST
    ? new Minio.Client({
        endPoint: MINIO_HOST,
        port: +MINIO_API_PORT,
        useSSL: false, // NODE_ENV !== "development",
        accessKey: MINIO_ROOT_USER,
        secretKey: MINIO_ROOT_PASSWORD,
      })
    : undefined;

// A browser-reachable MinIO client used only for presigning download URLs.
// The primary minioClient is configured with a docker-internal hostname
// (e.g. "minio:9000") that a browser cannot resolve, and the hostname is part
// of a presigned URL's signature — rewriting it after signing would invalidate
// the signature. So when MINIO_PUBLIC_HOST is set (e.g. "localhost", since
// docker-compose maps the MinIO API port to the host), we sign against a
// second client configured with that public endpoint. When it isn't set,
// presigning against MinIO is unavailable and callers fall back to streaming
// file bytes through the API.
export const minioPublicClient =
  backendStorage === "minio" && MINIO_PUBLIC_HOST
    ? new Minio.Client({
        endPoint: MINIO_PUBLIC_HOST,
        port: +(MINIO_PUBLIC_PORT || MINIO_API_PORT),
        useSSL: false,
        accessKey: MINIO_ROOT_USER,
        secretKey: MINIO_ROOT_PASSWORD,
      })
    : undefined;

// Toggle this to true if you want to test backblaze locally
// Note: you'll need both the backblaze key id and app key
// set for this to work.
// FIXME: this should / could be set in the database as part
// of the site settings.

// Instantiate a second minio client for backblaze
export const backblazeClient =
  backendStorage === "backblaze"
    ? new S3Client({
        region: S3_REGION,
        endpoint: S3_ENDPOINT,
        credentials: {
          accessKeyId: S3_ACCESS_KEY_ID,
          secretAccessKey: S3_SECRET_ACCESS_KEY,
        },
        responseChecksumValidation: "WHEN_REQUIRED",
        requestChecksumCalculation: "WHEN_REQUIRED",
        maxAttempts: 4,
      })
    : undefined;

const createB2BucketIfNotExists = async (bucket: string) => {
  if (!backblazeClient) {
    throw new Error("Backblaze client is not initialized");
  }
  logger.info(`backblaze: checking if a bucket exists: ${bucket}`);
  let exists;
  try {
    exists = await backblazeClient.send(
      new HeadBucketCommand({ Bucket: bucket })
    );
  } catch (e) {
    logger.info(`backblaze: failed to check, creating bucket: ${bucket}`);
    await backblazeClient.send(new CreateBucketCommand({ Bucket: bucket }));
    logger.info(`backblaze: created bucket: ${bucket}`);
  }

  return true;
};

export const fileExistCheckBackblaze = async (
  bucket: string,
  filename: string
): Promise<HeadObjectCommandOutput | undefined> => {
  if (!backblazeClient) {
    throw new Error("Backblaze client is not initialized");
  }
  let backblazeStat: HeadObjectCommandOutput | undefined = undefined;
  try {
    backblazeStat = await backblazeClient.send(
      new HeadObjectCommand({
        Bucket: bucket,
        Key: filename,
      }),
      {}
    );
  } catch (e) {
    const error = e as {
      name?: string;
      $metadata?: { httpStatusCode?: number };
    };

    if (
      error.$metadata?.httpStatusCode === 404 ||
      error.name === "NotFound" ||
      error.name === "NoSuchKey"
    ) {
      return undefined;
    }

    logger.error(
      `Error fetching static file from backblaze: ${bucket}/${filename}`
    );
    return undefined;
  }
  return backblazeStat;
};

export const statFile = async (bucket: string, filename: string) => {
  let minioStat;
  let backblazeStat;

  if (backendStorage === "backblaze") {
    backblazeStat = await fileExistCheckBackblaze(bucket, filename);
  }
  // If the object doesn't exist on backblaze we check in minio
  if (backendStorage === "minio" && minioClient) {
    try {
      minioStat = await minioClient.statObject(bucket, filename);
    } catch {
      logger.error(`minio doesn't have the file ${bucket}/${filename}`);
    }
  }
  return {
    minioStat,
    backblazeStat,
  };
};

export const createBucketIfNotExists = async (
  bucket: string,
  logger?: Logger
) => {
  let exists;
  logger?.info(`${backendStorage}: checking if a bucket exists in: ${bucket}`);

  if (backendStorage === "backblaze") {
    await createB2BucketIfNotExists(bucket);
  } else if (backendStorage === "minio" && minioClient) {
    try {
      exists = await minioClient.bucketExists(bucket);
    } catch (e) {
      logger?.error(e);
      logger?.info(`minio: failed to check, creating bucket: ${bucket}`);

      await minioClient.makeBucket(bucket);
      logger?.info(`minio: created bucket: ${bucket}`);
    }

    if (!exists) {
      logger?.info(`minio: does not exist, creating bucket: ${bucket}`);
      await minioClient.makeBucket(bucket);
      logger?.info(`minio: created bucket: ${bucket}`);
    }
  }

  return true;
};

export const uploadFilesToBackblaze = async (
  bucket: string,
  fileName: string,
  fileStream: Readable | Buffer,
  options?: { contentType?: string; cacheControl?: string }
) => {
  if (!backblazeClient) {
    throw new Error("Backblaze client is not initialized");
  }
  if (fileStream instanceof Buffer) {
    await backblazeClient.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: fileName,
        Body: fileStream,
        ContentType: options?.contentType,
        CacheControl: options?.cacheControl,
      })
    );
  } else {
    const upload = new Upload({
      client: backblazeClient,
      params: {
        Bucket: bucket,
        Key: fileName,
        Body: fileStream,
        ContentType: options?.contentType,
        CacheControl: options?.cacheControl,
      },
    });

    await upload.done();
  }
  logger.info(
    `${backendStorage}: done uploading filestream|buffer: ${bucket}/${fileName}`
  );
};

export const getPresignedUploadUrl = async (
  bucket: string,
  fileName: string,
  expiresInSeconds = 3600,
  // When provided, the upload is pinned to exactly this many bytes: the
  // client must send a body of this size or the storage backend rejects the
  // request. Note: only the Backblaze (S3) backend enforces this — the MinIO
  // client used in development cannot sign content-length on a presigned PUT.
  contentLength?: number
) => {
  await createBucketIfNotExists(bucket);
  if (backendStorage === "backblaze") {
    if (!backblazeClient) {
      throw new Error("Backblaze client is not initialized");
    }
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: fileName,
      ...(contentLength !== undefined ? { ContentLength: contentLength } : {}),
    });

    const url = await getSignedUrl(backblazeClient, command, {
      expiresIn: expiresInSeconds,
      // Force content-length into the signature so the size pin is enforced.
      ...(contentLength !== undefined
        ? { signableHeaders: new Set(["host", "content-length"]) }
        : {}),
    });
    return url;
  } else if (backendStorage === "minio" && minioClient) {
    const url = await minioClient.presignedPutObject(
      bucket,
      fileName,
      expiresInSeconds
    );
    return url;
  } else {
    throw new Error("No storage backend configured");
  }
};

// Presign a short-lived GET URL against whichever storage backend actually
// has the object, so downloads can go straight from the browser to storage
// instead of being piped through the API (which burns server egress — see
// the Render free-tier egress cap). Returns null when no presignable
// endpoint is available — e.g. the object only exists in a MinIO instance
// without a browser-reachable public host — in which case the caller should
// fall back to streaming the bytes through the API itself.
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
  const { backblazeStat, minioStat } = await statFile(bucket, filename);

  if (backblazeStat && backblazeClient) {
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
    return getSignedUrl(backblazeClient, command, {
      expiresIn: expiresInSeconds,
    });
  }

  if (minioStat && minioPublicClient) {
    const respHeaders: Record<string, string> = {};
    if (options?.downloadFilename) {
      respHeaders["response-content-disposition"] = contentDisposition(
        options.downloadFilename,
        { type: "attachment" }
      );
    }
    if (options?.contentType) {
      respHeaders["response-content-type"] = options.contentType;
    }
    return minioPublicClient.presignedGetObject(
      bucket,
      filename,
      expiresInSeconds,
      respHeaders
    );
  }

  return null;
};

export const uploadWrapper = async (
  bucket: string,
  fileName: string,
  fileStream: Readable | Buffer,
  options?: { contentType?: string; cacheControl?: string }
) => {
  logger.info(
    `${backendStorage}: uploading fileStream|buffer: ${bucket}/${fileName}`
  );
  if (backendStorage === "backblaze") {
    await uploadFilesToBackblaze(bucket, fileName, fileStream, options);
  } else if (backendStorage === "minio" && minioClient) {
    await minioClient.putObject(bucket, fileName, fileStream);
  }
};

export const removeObjectFromStorage = async (
  bucket: string,
  fileName: string
) => {
  if (backendStorage === "backblaze" && backblazeClient) {
    logger.info(`backblaze: removing fileStream: ${bucket}/${fileName}`);

    await backblazeClient.send(
      new DeleteObjectCommand({ Bucket: bucket, Key: fileName })
    );
  } else if (backendStorage === "minio" && minioClient) {
    logger.info(`minio: removing fileStream: ${bucket}/${fileName}`);

    await minioClient.removeObject(bucket, fileName);
  }
};

export const getBufferFromStorage = async (
  bucket: string,
  filename: string
) => {
  if (backendStorage === "backblaze") {
    logger.info(`backblaze: getting buffer: ${bucket}/${filename}`);

    return getBufferFromBackblaze(bucket, filename);
  } else if (backendStorage === "minio" && minioClient) {
    logger.info(`minio: getting buffer: ${bucket}/${filename}`);

    return getBufferFromMinio(minioClient, bucket, filename);
  } else {
    return { buffer: null };
  }
};

export const getBufferFromBackblaze = async (
  bucket: string,
  filename: string
) => {
  if (!backblazeClient) {
    throw new Error("Backblaze client is not initialized");
  }
  const result = await backblazeClient.send(
    new GetObjectCommand({ Bucket: bucket, Key: filename })
  );
  return {
    buffer: await result.Body?.transformToByteArray(),
    etag: result.ETag,
  };
};

export const downloadFileFromBackblaze = async (
  bucket: string,
  remoteFileName: string,
  localFilePath: string
) => {
  if (!backblazeClient) {
    throw new Error("Backblaze client is not initialized");
  }
  const result = await backblazeClient.send(
    new GetObjectCommand({ Bucket: bucket, Key: remoteFileName })
  );
  if (result.Body instanceof Readable) {
    await fs.promises.writeFile(localFilePath, result.Body);
  }
};

export const getFile = async (
  bucket: string,
  remoteFileName: string,
  localFilePath: string
) => {
  if (backendStorage === "backblaze") {
    logger.info(
      `${backendStorage}: getting buffer: ${bucket}/${remoteFileName} storing at ${localFilePath}`
    );

    return downloadFileFromBackblaze(bucket, remoteFileName, localFilePath);
  } else if (backendStorage === "minio" && minioClient) {
    logger.info(
      `${backendStorage}: getting buffer: ${bucket}/${remoteFileName} storing at ${localFilePath}`
    );

    await getFileFromMinio(bucket, remoteFileName, localFilePath);
  }
};

export const getReadStream = async (bucket: string, remoteFileName: string) => {
  if (backendStorage === "backblaze") {
    logger.info(`backblaze: getting buffer: ${bucket}/${remoteFileName}`);

    return getReadStreamFromBackblaze(bucket, remoteFileName);
  } else if (backendStorage === "minio" && minioClient) {
    logger.info(`minio: getting buffer: ${bucket}/${remoteFileName}`);

    return minioClient.getObject(bucket, remoteFileName);
  }
};

export const getReadStreamFromBackblaze = async (
  bucket: string,
  remoteFileName: string
) => {
  if (!backblazeClient) {
    throw new Error("Backblaze client is not initialized");
  }
  const result = await backblazeClient.send(
    new GetObjectCommand({ Bucket: bucket, Key: remoteFileName })
  );
  if (result.Body instanceof Readable) {
    return result.Body;
  }
};

export const getBufferBasedOnStat = async (
  bucket: string,
  filename: string,
  backblazeStat?: HeadObjectCommandOutput
) => {
  if (backblazeStat) {
    const { buffer } = await getBufferFromBackblaze(bucket, filename);

    return buffer;
  } else if (backendStorage === "minio" && minioClient) {
    const { buffer } = await getBufferFromMinio(minioClient, bucket, filename);

    return buffer;
  }
};

export async function getBufferFromMinio(
  minioClient: Client,
  bucket: string,
  filename: string
): Promise<{ buffer: Buffer }> {
  return new Promise((resolve: (result: { buffer: Buffer }) => any, reject) => {
    const buff: Buffer[] = [];
    minioClient
      .getObject(bucket, filename)
      .then(function (dataStream) {
        dataStream.on("data", async function (chunk) {
          buff.push(chunk);
        });
        dataStream.on("end", function () {
          resolve({ buffer: Buffer.concat(buff) });
        });
        dataStream.on("error", function (err) {
          logger.error(err);
          reject(err);
        });
      })
      .catch(reject);
  });
}

export async function getFileFromMinio(
  bucket: string,
  filename: string,
  destinationFilePath: string
): Promise<{ filePath: string }> {
  if (!minioClient) {
    throw new Error("MinIO client is not initialized");
  }

  return new Promise(
    async (resolve: (result: { filePath: string }) => any, reject) => {
      logger?.info(
        `Getting object from MinIO Bucket ${bucket}: ${filename} in ${destinationFilePath}`
      );
      // await fs.mkdirSync(`${destinationFolderName}`, { recursive: true });

      // const filePath = `${destinationFolderName}/${
      //   destinationFilePath ?? `${bucket}_${filename}`
      // }`;

      const writableStream = fs.createWriteStream(`${destinationFilePath}`);
      // var size = 0;
      minioClient
        .getObject(bucket, filename)
        .then(function (dataStream) {
          dataStream.on("data", async function (chunk) {
            writableStream.write(chunk);
          });
          dataStream.on("end", function () {
            // logger?.info("End. Total size = " + size);
            writableStream.end();
            writableStream.on("finish", () => {
              logger?.info(`getFileFromMinio ${destinationFilePath}`);
              resolve({ filePath: destinationFilePath });
            });
            // resolve({ buffer: Buffer.concat(buff), size });
            resolve;
          });
          dataStream.on("error", function (err) {
            logger?.error(err);
            reject(err);
          });
        })
        .catch(reject);
    }
  );
}

export const getObjectList = async (
  bucket: string,
  prefix: string
): Promise<BucketItem[]> => {
  if (backendStorage === "backblaze" && backblazeClient) {
    const result = await backblazeClient.send(
      new ListObjectsCommand({ Bucket: bucket, Prefix: prefix })
    );
    return (
      result.Contents?.map((c) => (c?.Key ? { name: c.Key } : undefined)) ?? []
    ).filter((c) => !!c) as BucketItem[];
  } else {
    const result = await getObjectListFromMinio(bucket, prefix);
    return result;
  }
};

export const getObjectListFromMinio = async (
  bucket: string,
  prefix: string
): Promise<BucketItem[]> => {
  if (!minioClient) {
    throw new Error("MinIO client is not initialized");
  }
  return await new Promise((resolve, reject) => {
    const data: BucketItem[] = [];
    const stream = minioClient.listObjectsV2(bucket, prefix, true);
    stream.on("data", function (obj) {
      data.push(obj);
    });
    stream.on("end", function () {
      resolve(data);
    });
    stream.on("error", function (err) {
      console.error(err);
      reject(err);
    });
  });
};

export const removeObjectsFromBucket = async (
  bucketName: string,
  prefix: string
) => {
  const objects = await getObjectList(bucketName, prefix);
  if (backendStorage === "backblaze") {
    await Promise.all(
      objects.map((o) => removeObjectFromStorage(bucketName, o.name!))
    );
  } else if (backendStorage === "minio" && minioClient) {
    const minioObojects = await getObjectListFromMinio(bucketName, prefix);

    await minioClient.removeObjects(
      bucketName,
      minioObojects.map((o) => o.name!)
    );
  }
};

// ─── Domain storage operations ────────────────────────────────────────────────
// All bucket selection and key construction lives here.
// Call sites express intent; this layer handles the routing.

// ── Audio ─────────────────────────────────────────────────────────────────────

const audioIncomingKey = (audioId: string) =>
  isConsolidatedMode() ? `incoming/${audioId}` : audioId;

export const uploadIncomingAudio = async (
  audioId: string,
  stream: Readable
) => {
  const bucket = getAudioBucket(incomingAudioBucket);
  await ensureBucketCached(bucket);
  return uploadWrapper(bucket, audioIncomingKey(audioId), stream);
};

export const downloadIncomingAudio = (audioId: string, destPath: string) =>
  getFile(
    getAudioBucket(incomingAudioBucket),
    audioIncomingKey(audioId),
    destPath
  );

export const getAudioUploadUrl = (audioId: string) =>
  getPresignedUploadUrl(
    getAudioBucket(incomingAudioBucket),
    audioIncomingKey(audioId)
  );

export const removeIncomingAudio = (audioId: string) =>
  removeObjectFromStorage(
    getAudioBucket(incomingAudioBucket),
    audioIncomingKey(audioId)
  );

export const downloadOriginalAudio = (
  audioId: string,
  ext: string,
  destPath: string
) => getFile(getAudioBucket(), `${audioId}/original.${ext}`, destPath);

export const streamOriginalAudio = (audioId: string, ext: string) =>
  getReadStream(getAudioBucket(), `${audioId}/original.${ext}`);

export const statAudioSegment = (audioId: string, segment: string) =>
  statFile(getAudioBucket(), `${audioId}/${segment}`);

export const getAudioSegmentBuffer = (
  audioId: string,
  segment: string,
  stat?: HeadObjectCommandOutput
) => getBufferBasedOnStat(getAudioBucket(), `${audioId}/${segment}`, stat);

export const uploadAudioHlsFile = async (
  audioId: string,
  filename: string,
  stream: Readable
) => {
  const bucket = getAudioBucket();
  await ensureBucketCached(bucket);
  return uploadWrapper(bucket, `${audioId}/${filename}`, stream);
};

export const removeAudioFiles = (audioId: string) =>
  removeObjectsFromBucket(getAudioBucket(), audioId);

// ── Images ────────────────────────────────────────────────────────────────────

export const getImageFinalBucket = (imageType: ImageType): string =>
  imageTypeBuckets[imageType].final;

export const imageTypeUsesQueue = (imageType: ImageType): boolean =>
  imageTypeBuckets[imageType].queue;

export const uploadIncomingImageByType = async (
  imageType: ImageType,
  fileName: string,
  stream: Readable,
  options?: { contentType?: string }
) => {
  const { incoming, prefix } = imageTypeBuckets[imageType];
  const bucket = getImagesBucket(incoming);
  await ensureBucketCached(bucket);
  const key =
    isConsolidatedMode() && prefix
      ? `incoming/${prefix}/${fileName}`
      : fileName;
  return uploadWrapper(bucket, key, stream, options);
};

export const downloadIncomingImageByType = (
  imageType: ImageType,
  imageId: string
) => {
  const { incoming, prefix } = imageTypeBuckets[imageType];
  return getBufferFromStorage(
    getImagesBucket(incoming),
    isConsolidatedMode() && prefix ? `incoming/${prefix}/${imageId}` : imageId
  );
};

export const uploadOptimizedImageByType = async (
  imageType: ImageType,
  fileName: string,
  buffer: Buffer,
  options?: { contentType?: string; cacheControl?: string }
) => {
  const { final, prefix } = imageTypeBuckets[imageType];
  const bucket = getImagesBucket(final);
  await ensureBucketCached(bucket);
  const key =
    isConsolidatedMode() && prefix ? `${prefix}/${fileName}` : fileName;
  return uploadWrapper(bucket, key, buffer, options);
};

export const removeIncomingImageByType = (
  imageType: ImageType,
  imageId: string
) => {
  const { incoming, prefix } = imageTypeBuckets[imageType];
  return removeObjectFromStorage(
    getImagesBucket(incoming),
    isConsolidatedMode() && prefix ? `incoming/${prefix}/${imageId}` : imageId
  );
};

export const getCoverBuffer = (coverId: string, ext: "webp" | "jpg") =>
  getBufferFromStorage(
    getImagesBucket(finalCoversBucket),
    `${isConsolidatedMode() ? `${finalCoversBucket}/` : ""}${coverId}-x1500.${ext}`
  );

export const removeCoverImages = (coverId: string) =>
  removeObjectsFromBucket(
    getImagesBucket(finalCoversBucket),
    isConsolidatedMode() ? `${finalCoversBucket}/${coverId}` : coverId
  );

// ── Downloadable content ──────────────────────────────────────────────────────

const contentKey = (id: string) =>
  isConsolidatedMode() ? `content/${id}` : id;

export const getDownloadableContentUploadUrl = (id: string) =>
  getPresignedUploadUrl(
    getDownloadsBucket(downloadableContentBucket),
    contentKey(id)
  );

export const statDownloadableContent = (id: string) =>
  statFile(getDownloadsBucket(downloadableContentBucket), contentKey(id));

export const getDownloadableContentBufferFromStat = (
  id: string,
  stat?: HeadObjectCommandOutput
) =>
  getBufferBasedOnStat(
    getDownloadsBucket(downloadableContentBucket),
    contentKey(id),
    stat
  );

export const getDownloadableContentBuffer = (id: string) =>
  getBufferFromStorage(
    getDownloadsBucket(downloadableContentBucket),
    contentKey(id)
  );

export const removeDownloadableContent = (id: string) =>
  removeObjectsFromBucket(
    getDownloadsBucket(downloadableContentBucket),
    contentKey(id)
  );

// ── Zips ──────────────────────────────────────────────────────────────────────

const zipBucket = (type: "track" | "trackGroup") =>
  type === "track"
    ? getDownloadsBucket(trackFormatBucket)
    : getDownloadsBucket(trackGroupFormatBucket);

const zipKey = (type: "track" | "trackGroup", id: number, format: string) =>
  `${isConsolidatedMode() ? `${type === "track" ? "track" : "trackgroup"}/` : ""}${id}/${format}.zip`;

export const statZip = (
  type: "track" | "trackGroup",
  id: number,
  format: string
) => statFile(zipBucket(type), zipKey(type, id, format));

export const streamZip = (
  type: "track" | "trackGroup",
  id: number,
  format: string
) => getReadStream(zipBucket(type), zipKey(type, id, format));

export const presignZip = (
  type: "track" | "trackGroup",
  id: number,
  format: string,
  options?: Parameters<typeof getPresignedDownloadUrl>[2]
) =>
  getPresignedDownloadUrl(zipBucket(type), zipKey(type, id, format), options);

export const uploadZip = async (
  type: "track" | "trackGroup",
  id: number,
  format: string,
  stream: Readable
) => {
  const bucket = zipBucket(type);
  await ensureBucketCached(bucket);
  return uploadWrapper(bucket, zipKey(type, id, format), stream);
};
