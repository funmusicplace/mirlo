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
