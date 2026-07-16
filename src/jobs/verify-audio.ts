import { promises as fsPromises } from "fs";

import { Job } from "bullmq";

import { downloadOriginalAudio } from "../utils/minio";

import { logger } from "./queue-worker";
const TEMP_LOCATION = process.env.TEMP_LOCATION;

export default async (job: Job) => {
  const { audioId, fileExtension } = job.data;

  try {
    logger.info(`audioId: ${audioId} \t verifying audio`);

    if (!process.env.AUDD_IO_TOKEN) {
      return;
    }

    let progress = 10;
    const tempFolder = `${TEMP_LOCATION}verifying/${audioId}`;

    try {
      await fsPromises.stat(tempFolder);
    } catch (e) {
      await fsPromises.mkdir(tempFolder, { recursive: true });
    }

    const localTrackPath = `${tempFolder}/original.${fileExtension}`;

    await downloadOriginalAudio(audioId, fileExtension, localTrackPath);

    logger.info(`audioId: ${audioId} \t got the track audio`);

    await job.updateProgress(progress);

    logger.info(`audioId: ${audioId} \t checking audio for existing tags`);

    // const stats = statSync(localTrackPath);
    // const fileSizeInBytes = stats.size;

    // You can pass any of the 3 objects below as body
    // const stream = await createReadStream(localTrackPath);
    // const file = await readFileSync(localTrackPath);
    // const blob = new Blob([file], { type: `audio/${fileExtension}` });

    // const formData = new FormData();
    // formData.append("file", blob);
    // formData.append("api_token", process.env.AUDD_IO_TOKEN);

    const url = `${process.env.API_DOMAIN}/v1/tracks/${audioId}/audio`;
    const jsonBody = JSON.stringify({
      url,
      api_token: process.env.AUDD_IO_TOKEN,
      skip: 4,
      every: 1,
      skip_first_second: 30,
      return: "musicbrainz",
    });

    const response = await fetch(`https://enterprise.audd.io/recognize`, {
      method: "POST",
      body: jsonBody,
    });

    await fsPromises.rm(localTrackPath, { recursive: true });
    logger.info(`Cleaned up ${localTrackPath}`);

    logger.info(`audioId: ${audioId} \t verifying chromaprint exists`);
  } catch (e) {
    logger.error("Error verifying audio", e);
    return { error: e };
  }
};
