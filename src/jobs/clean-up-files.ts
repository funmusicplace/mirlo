import { promises as fsPromises } from "fs";
import logger from "../logger";

const cleanUpFiles = async (incomingFolder: string) => {
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
