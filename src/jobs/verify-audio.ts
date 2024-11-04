import { Job } from "bullmq";

import ffmpeg from "fluent-ffmpeg";
import { createReadStream, promises as fsPromises } from "fs";

import { logger } from "./queue-worker";
import { finalAudioBucket, minioClient } from "../utils/minio";

const {
  MINIO_HOST = "",
  MINIO_ROOT_USER = "",
  MINIO_API_PORT = 9000,
} = process.env;

export default async (job: Job) => {
  const { audioId, fileExtension } = job.data;

  try {
    const destinationFolder = `/data/media/verifying/${audioId}`;

    logger.info(`audioId: ${audioId} \t verifying audio`);

    let progress = 10;
    const tempFolder = `/data/media/verifying/${audioId}`;
    logger.info(
      `MinIO is at ${MINIO_HOST}:${MINIO_API_PORT} ${MINIO_ROOT_USER}`
    );
    try {
      await fsPromises.stat(tempFolder);
    } catch (e) {
      await fsPromises.mkdir(tempFolder, { recursive: true });
    }

    const minioTrackLocation = `${audioId}/original.${fileExtension}`;
    const localTrackPath = `${tempFolder}/original.${fileExtension}`;
    await minioClient.fGetObject(
      finalAudioBucket,
      minioTrackLocation,
      localTrackPath
    );

    logger.info(`audioId: ${audioId} \t set up all the right files`);

    await job.updateProgress(progress);

    logger.info(`audioId: ${audioId} \t getting chromaprint of file`);

    ffmpeg.getAvailableFormats((err, formats) => {
      console.log("all formats are");
      console.dir(formats);
    });

    const stream = await createReadStream(localTrackPath);
    // ffmpeg(stream)
    //   .outputOptions("-chromaprint")
    //   .on("error", function (err, stdout, stderr) {
    //     console.log("Error: " + err.message);
    //     console.log("ffmpeg output:\n" + stdout);
    //     console.log("ffmpeg stderr:\n" + stderr);
    //   })
    //   .on("end", function () {})
    //   .save(destinationFolder);

    logger.info(`audioId: ${audioId} \t verifying chromaprint exists`);
  } catch (e) {
    logger.error("Error creating audio folder", e);
    return { error: e };
  }
};
