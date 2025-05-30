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
import { Readable } from "stream";

export const incomingArtistBannerBucket = "incoming-artist-banners";
export const finalArtistBannerBucket = "artist-banners";

export const incomingArtistAvatarBucket = "incoming-artist-avatars";
export const finalArtistAvatarBucket = "artist-avatars";

export const incomingUserAvatarBucket = "incoming-user-avatars";
export const finalUserAvatarBucket = "mirlo-user-avatars";

export const incomingCoversBucket = "incoming-covers";
export const finalCoversBucket = "trackgroup-covers";

export const incomingMerchImageBucket = "incoming-merch-images";
export const finalMerchImageBucket = "merch-images";

export const finalPostImageBucket = "post-images";

export const incomingAudioBucket = "incoming-track-audio";
export const finalAudioBucket = "track-audio";

export const trackGroupFormatBucket = "trackgroup-format";
export const trackFormatBucket = "track-format";

const {
  MINIO_HOST = "",
  MINIO_ROOT_USER = "",
  MINIO_ROOT_PASSWORD = "",
  BACKBLAZE_KEY_ID = "",
  BACKBLAZE_APP_KEY = "",
  BACKBLAZE_ENDPOINT = "https://s3.us-east-005.backblazeb2.com",
  BACKBBLAZE_REGION = "us-east-005",
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

// Toggle this to true if you want to test backblaze locally
// Note: you'll need both the backblaze key id and app key
// set for this to work.
// FIXME: this should / could be set in the database as part
// of the site settings.
export const backendStorage: "minio" | "backblaze" =
  NODE_ENV === "production" ? "backblaze" : "minio";

// Instantiate a second minio client for backblaze
export const backblazeClient = new S3Client({
  region: BACKBBLAZE_REGION,
  endpoint: BACKBLAZE_ENDPOINT,
  credentials: {
    accessKeyId: BACKBLAZE_KEY_ID,
    secretAccessKey: BACKBLAZE_APP_KEY,
  },
  maxAttempts: 1,
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

  return true;
};

export const fileExistCheckBackblaze = async (
  bucket: string,
  filename: string
): Promise<HeadObjectCommandOutput | undefined> => {
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
  if (backendStorage === "minio") {
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
  } else {
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
  } else {
    await minioClient.putObject(bucket, fileName, fileStream);
  }
};

export const removeObjectFromStorage = async (
  bucket: string,
  fileName: string
) => {
  if (backendStorage === "backblaze") {
    logger.info(`backblaze: removing fileStream: ${bucket}/${fileName}`);

    await backblazeClient.send(
      new DeleteObjectCommand({ Bucket: bucket, Key: fileName })
    );
  } else {
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
  } else {
    logger.info(`minio: getting buffer: ${bucket}/${filename}`);

    return getBufferFromMinio(minioClient, bucket, filename);
  }
};

export const getBufferFromBackblaze = async (
  bucket: string,
  filename: string
) => {
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
  } else {
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
  } else {
    logger.info(`minio: getting buffer: ${bucket}/${remoteFileName}`);

    return minioClient.getObject(bucket, remoteFileName);
  }
};

export const getReadStreamFromBackblaze = async (
  bucket: string,
  remoteFileName: string
) => {
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
  } else {
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
  if (backendStorage === "backblaze") {
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
  } else {
    const minioObojects = await getObjectListFromMinio(bucketName, prefix);

    await minioClient.removeObjects(
      bucketName,
      minioObojects.map((o) => o.name!)
    );
  }
};
