import { Client } from "minio";
import { Logger } from "winston";
import * as Minio from "minio";
import fs from "fs";

export const incomingArtistBannerBucket = "incoming-artist-banners";
export const finalArtistBannerBucket = "artist-banners";

export const incomingArtistAvatarBucket = "incoming-artist-banners";
export const finalArtistAvatarBucket = "artist-avatars";

export const incomingCoversBucket = "incoming-covers";
export const finalCoversBucket = "trackgroup-covers";

export const incomingAudioBucket = "incoming-track-audio";
export const finalAudioBucket = "track-audio";

const {
  MINIO_HOST = "",
  MINIO_ROOT_USER = "",
  MINIO_ROOT_PASSWORD = "",
  MINIO_API_PORT = 9000,
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

export const createBucketIfNotExists = async (
  minioClient: Client,
  bucket: string,
  logger?: Logger
) => {
  logger?.info("minio: Checking if a bucket exists");
  const exists = await minioClient.bucketExists(bucket);

  if (!exists) {
    logger?.info("minio: Need to create bucket");
    await minioClient.makeBucket(bucket);
  }
};

export async function getBufferFromMinio(
  minioClient: Client,
  bucket: string,
  filename: string,
  logger?: Logger
): Promise<{ buffer: Buffer; size: number }> {
  return new Promise(
    (resolve: (result: { buffer: Buffer; size: number }) => any, reject) => {
      logger?.info(`Getting object from MinIO Bucket ${bucket}: ${filename}`);
      const buff: Buffer[] = [];
      var size = 0;
      minioClient
        .getObject(bucket, filename)
        .then(function (dataStream) {
          logger?.info("Got stream");
          dataStream.on("data", async function (chunk) {
            buff.push(chunk);
            size += chunk.length;
          });
          dataStream.on("end", function () {
            logger?.info("End. Total size = " + size);
            resolve({ buffer: Buffer.concat(buff), size });
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
