import { promises as fsPromises } from "fs";

import logger from "../../logger";
import { startCleaningUpOldFiles } from "../../queues/clean-up-old-files-queue";
import { removeAllZips, removeZips, zipRootPath } from "../../utils/minio";

const cleanUpFiles = async (incomingFolder: string) => {
  logger.info("cleanUpFiles");
  const zipRoot = zipRootPath("trackGroup");
  if (incomingFolder === zipRoot || incomingFolder.startsWith(`${zipRoot}/`)) {
    const albumId = incomingFolder.slice(zipRoot.length + 1);
    logger.info(`cleaning up ${albumId || "all files"} in ${zipRoot}`);

    if (albumId) {
      await removeZips("trackGroup", Number(albumId));
    } else {
      await removeAllZips("trackGroup");
    }
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

export default cleanUpFiles;
