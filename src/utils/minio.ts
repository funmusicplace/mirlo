import { Client } from "minio";
import { Logger } from "winston";
import * as Minio from "minio";
import {
  S3Client,
  CreateBucketCommand,
  HeadBucketCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import fs from "fs";
import logger from "../logger";
import { Upload } from "@aws-sdk/lib-storage";
import { Readable } from "stream";

export const incomingArtistBannerBucket = "incoming-artist-banners";
export const finalArtistBannerBucket = "artist-banners";

export const incomingArtistAvatarBucket = "incoming-artist-avatars";
export const finalArtistAvatarBucket = "artist-avatars";

export const incomingCoversBucket = "incoming-covers";
export const finalCoversBucket = "trackgroup-covers";

export const incomingMerchImageBucket = "incoming-merch-images";
export const finalMerchImageBucket = "merch-images";

export const finalPostImageBucket = "post-images";

export const incomingAudioBucket = "incoming-track-audio";
export const finalAudioBucket = "track-audio";

export const trackGroupFormatBucket = "trackgroup-format";

const {
  MINIO_HOST = "",
  MINIO_ROOT_USER = "",
  MINIO_ROOT_PASSWORD = "",
  BACKBLAZE_KEY_NAME = "",
  BACKBLAZE_KEY_ID = "",
  BACKBLAZE_APP_KEY = "",
  MINIO_API_PORT = 9000,
  NODE_ENV,
} = process.env;

// Instantiate the minio client with the endpoint
// and access keys as shown below.
export const minioClient = new Minio.Client({
  endPoint: MINIO_HOST,
  port: +MINIO_API_PORT,
  useSSL: false, // NODE_ENV !== "development",
  accessKey: MINIO_ROOT_USER,
  secretKey: MINIO_ROOT_PASSWORD,
});

// Instantiate a second minio client for backblaze
export const backblazeClient = new S3Client({
  region: "us-east-005",
  endpoint: "https://s3.us-east-005.backblazeb2.com",
  credentials: {
    accessKeyId: BACKBLAZE_KEY_ID,
    secretAccessKey: BACKBLAZE_APP_KEY,
  },
});

const createB2BucketIfNotExists = async (bucket: string) => {
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

  if (!exists) {
    logger.info(`backblaze: does not exist, creating bucket: ${bucket}`);
    await backblazeClient.send(new CreateBucketCommand({ Bucket: bucket }));
    logger.info(`backblaze: created bucket: ${bucket}`);
  } else {
    logger.info(`backblaze: bucket exists: ${bucket}`);
  }

  return true;
};

export const createBucketIfNotExists = async (
  minioClient: Client,
  bucket: string,
  logger?: Logger
) => {
  logger?.info(`minio: checking if a bucket exists: ${bucket}`);
  let exists;
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

  if (NODE_ENV === "production") {
    await createB2BucketIfNotExists(bucket);
  }

  return true;
};

export const uploadWrapper = async (
  bucket: string,
  fileName: string,
  fileStream: Readable
) => {
  if (NODE_ENV === "production") {
    const upload = new Upload({
      client: backblazeClient,
      params: {
        Bucket: bucket,
        Key: fileName,
        Body: fileStream,
      },
    });
    await upload.done();
  } else {
    await minioClient.putObject(bucket, fileName, fileStream);
  }
};

export const getBufferFromBackblaze = async (
  bucket: string,
  filename: string
) => {
  const result = await backblazeClient.send(
    new GetObjectCommand({ Bucket: bucket, Key: filename })
  );
  return { buffer: await result.Body?.transformToByteArray() };
};

export const getBufferFromStorage = async (
  minioClient: Client,
  bucket: string,
  filename: string
) => {
  if (NODE_ENV === "production") {
    return getBufferFromBackblaze(bucket, filename);
  } else {
    return getBufferFromMinio(minioClient, bucket, filename);
  }
};

export async function getBufferFromMinio(
  minioClient: Client,
  bucket: string,
  filename: string
): Promise<{ buffer: Buffer }> {
  return new Promise((resolve: (result: { buffer: Buffer }) => any, reject) => {
    logger.info(`Getting object from MinIO Bucket ${bucket}: ${filename}`);
    const buff: Buffer[] = [];
    var size = 0;
    minioClient
      .getObject(bucket, filename)
      .then(function (dataStream) {
        logger.info("Got stream");
        dataStream.on("data", async function (chunk) {
          buff.push(chunk);
          size += chunk.length;
        });
        dataStream.on("end", function () {
          logger.info("End. Total size = " + size);
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
  minioClient: Client,
  bucket: string,
  filename: string,
  destinationFolderName?: string,
  destinationFilePath?: string,
  logger?: Logger
): Promise<{ filePath: string }> {
  return new Promise(
    async (resolve: (result: { filePath: string }) => any, reject) => {
      logger?.info(
        `Getting object from MinIO Bucket ${bucket}: ${filename} in ${destinationFolderName}`
      );
      await fs.mkdirSync(`${destinationFolderName}`, { recursive: true });

      const filePath = `${destinationFolderName}/${
        destinationFilePath ?? `${bucket}_${filename}`
      }`;

      const writableStream = fs.createWriteStream(`${filePath}`);
      // var size = 0;
      minioClient
        .getObject(bucket, filename)
        .then(function (dataStream) {
          logger?.info("Got stream");
          dataStream.on("data", async function (chunk) {
            writableStream.write(chunk);
          });
          dataStream.on("end", function () {
            // logger?.info("End. Total size = " + size);
            writableStream.end();
            writableStream.on("finish", () => {
              logger?.info(`Everything exists at filePath  ${filePath}`);
              resolve({ filePath });
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
): Promise<{ name: string }[]> => {
  return await new Promise((resolve, reject) => {
    const data: { name: string }[] = [];
    const stream = minioClient.listObjects(bucket, prefix, true);
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
  await minioClient.removeObjects(
    bucketName,
    objects.map((o) => o.name)
  );
};
