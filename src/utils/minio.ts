import { Client } from "minio";
import { Logger } from "winston";

export const incomingCoversBucket = "incoming-covers";
export const finalCoversBucket = "trackgroup-covers";

export const createBucketIfNotExists = async (
  minioClient: Client,
  bucket: string,
  logger?: Logger
) => {
  logger?.info("Checking if a bucket exists");
  const exists = await minioClient.bucketExists(bucket);

  if (!exists) {
    logger?.info("Need to create bucket");
    await minioClient.makeBucket(bucket);
  }
};

export async function getObjectFromMinio(
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
