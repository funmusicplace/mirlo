import { promises as fsPromises } from "fs";
import logger from "../../logger";
import {
  removeObjectsFromBucket,
  trackGroupFormatBucket,
} from "../../utils/minio";
import { startCleaningUpOldFiles } from "../../queues/clean-up-old-files-queue";

const cleanUpFiles = async (incomingFolder: string) => {
  logger.info("cleanUpFiles");
  if (incomingFolder.startsWith(trackGroupFormatBucket)) {
    const split = incomingFolder.split(/\/(.*)/);
    const bucket = split[0];
    const albumId = split[1];
    logger.info(
      `cleaning up ${albumId ?? "all files"} in the trackgroup minio container`
    );

    await removeBucket(bucket, albumId);
    return {
      deleted: incomingFolder,
    };
  }
  if (incomingFolder === "background-worker") {
    logger.info("starting a job to clean up files in the background worker");
    startCleaningUpOldFiles();
    return {
      deleted: incomingFolder,
    };
  }
  try {
    await fsPromises.stat(incomingFolder);
  } catch (e) {
    logger.info(`${incomingFolder} doesn't exist`);

    return;
  }
  const finalFilesInFolder = await fsPromises.readdir(incomingFolder);
  logger.info(`There are ${finalFilesInFolder.length} files to check out`);

  let counter = 0;
  for (const file of finalFilesInFolder) {
    const filePath = incomingFolder + "/" + file;
    const stats = await fsPromises.stat(incomingFolder + "/" + file);
    const twoDaysMs = 1000 * 60 * 60 * 24 * 2;
    const today = new Date();
    const twoDaysAgoMs = today.setDate(today.getDate() - 2);
    if (stats.birthtimeMs - twoDaysMs < twoDaysAgoMs) {
      fsPromises.rm(filePath, { force: true, recursive: true });
      counter++;
    }
  }
  logger.info(`Deleted ${counter} files`);
  return {
    deleted: counter,
  };
};

const removeBucket = async (bucketName: string, prefix: string) => {
  logger.info(`Removing ${prefix ?? "all objects"} from ${bucketName}`);
  await removeObjectsFromBucket(bucketName, prefix ?? "");
};

export default cleanUpFiles;
