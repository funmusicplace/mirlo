import { Client, BucketItem } from "minio";
import { Logger } from "winston";
import * as Minio from "minio";
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
import fs from "fs";
import logger from "../logger";
import { Upload } from "@aws-sdk/lib-storage";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Readable } from "stream";

const s3UniquePrefix = "";

export const incomingArtistBannerBucket =
  s3UniquePrefix + "incoming-artist-banners";
export const finalArtistBannerBucket = s3UniquePrefix + "artist-banners";

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

const {
  MINIO_HOST = "",
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
  backendStorage === "minio"
    ? new Minio.Client({
        endPoint: MINIO_HOST,
        port: +MINIO_API_PORT,
        useSSL: false, // NODE_ENV !== "development",
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
    return undefined;
  }
  return backblazeStat;
};

export const statFile = async (bucket: string, filename: string) => {
  let minioStat;
  let backblazeStat;

  if (backendStorage === "backblaze") {
    backblazeStat = await fileExistCheckBackblaze(bucket, filename);
    if (!backblazeStat) {
      // don't need to log this if our backend storage isn't backblaze
      logger.error(
        `Error fetching static file from backblaze: ${bucket}/${filename}`
      );
    }
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
  options?: { contentType?: string }
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
  expiresInSeconds = 3600
) => {
  await createBucketIfNotExists(bucket);
  if (backendStorage === "backblaze") {
    if (!backblazeClient) {
      throw new Error("Backblaze client is not initialized");
    }
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: fileName,
    });

    const url = await getSignedUrl(backblazeClient, command, {
      expiresIn: expiresInSeconds,
    });
    return url;
  } else if (backendStorage === "minio" && minioClient) {
    const url = await minioClient.presignedGetObject(
      bucket,
      fileName,
      expiresInSeconds
    );
    return url;
  } else {
    throw new Error("No storage backend configured");
  }
};

export const uploadWrapper = async (
  bucket: string,
  fileName: string,
  fileStream: Readable | Buffer,
  options?: { contentType?: string }
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
