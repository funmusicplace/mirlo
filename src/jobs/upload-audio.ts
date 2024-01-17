import { Job } from "bullmq";

import ffmpeg from "fluent-ffmpeg";
import { createReadStream, promises as fsPromises } from "fs";

import { logger } from "./queue-worker";
import {
  createBucketIfNotExists,
  finalAudioBucket,
  incomingAudioBucket,
  minioClient,
} from "../utils/minio";

const {
  MINIO_HOST = "",
  MINIO_ROOT_USER = "",
  MINIO_API_PORT = 9000,
} = process.env;

export default async (job: Job) => {
  const { audioId, fileExtension } = job.data;
  let progress = 10;

  try {
    const destinationFolder = `/data/media/processing/${audioId}`;

    logger.info(
      `MinIO is at ${MINIO_HOST}:${MINIO_API_PORT} ${MINIO_ROOT_USER}`
    );

    logger.info(
      `checking if folder exists, if not creating it ${destinationFolder}`
    );

    await createBucketIfNotExists(minioClient, finalAudioBucket, logger);
    try {
      await fsPromises.stat(destinationFolder);
    } catch (e) {
      await fsPromises.mkdir(destinationFolder, { recursive: true });
    }

    const originalPath = `${destinationFolder}/original.${fileExtension}`;

    // FIXME: can this be converted to a stream
    await minioClient.fGetObject(incomingAudioBucket, audioId, originalPath);

    let data: any;

    const profiler = logger.startTimer();

    await job.updateProgress(progress);

    const hlsStream = await createReadStream(originalPath);

    const duration = await new Promise(async (resolve, reject) => {
      let duration = 0;
      ffmpeg(hlsStream)
        .noVideo()
        .outputOptions("-movflags", "+faststart")
        .addOption("-start_number", "0") // start the first .ts segment at index 0
        .addOption("-hls_time", "10") // 10 second segment duration
        .addOption("-hls_list_size", "0") // Maxmimum number of playlist entries (0 means all entries/infinite)
        .addOption(
          "-hls_segment_filename",
          `${destinationFolder}/segment-%03d.ts`
        )
        .addOption("-f", "hls") // HLS format
        .audioChannels(2)
        .audioBitrate("320k")
        .audioFrequency(48000)
        .audioCodec("libfdk_aac") // convert using Fraunhofer FDK AAC
        .on("start", () => {
          logger.info("audioId ${audioId}: Converting original to hls");
        })
        .on("error", (err: { message: unknown }) => {
          logger.error(`Error converting to hls: ${err.message}`);
          reject(err);
        })
        .on("progress", (data: { timemark: string }) => {
          if (data.timemark.includes(":")) {
            const timeArray = data.timemark.split(":");
            duration =
              Math.round(+timeArray[0]) * 60 * 60 +
              Math.round(+timeArray[1]) * 60 +
              Math.round(+timeArray[2]);
          }
        })
        .on("end", async () => {
          resolve(duration);
        })
        .save(`${destinationFolder}/playlist.m3u8`);
    });

    await job.updateProgress(90);

    const finalFilesInFolder = await fsPromises.readdir(destinationFolder);

    for await (const file of finalFilesInFolder) {
      const uploadStream = await createReadStream(
        `${destinationFolder}/${file}`
      );
      await minioClient.putObject(
        finalAudioBucket,
        `${audioId}/${file}`,
        uploadStream
      );
      logger.info(`audioId ${audioId}: Uploading file ${file}`);
    }

    profiler.done({ message: "Done converting to audio" });

    logger.info(`audioId ${audioId}: Done processing streams`);

    await minioClient.removeObject(incomingAudioBucket, audioId);
    logger.info(`audioId ${audioId}: Cleaned up incoming minio folder`);
    await fsPromises.rm(destinationFolder, { recursive: true });
    logger.info(`Cleaned up ${destinationFolder}`);
    const response = { ...(data ?? {}), duration };
    logger.info(`Data: ${JSON.stringify(response)}`);
    return response;
  } catch (e) {
    logger.error("Error creating audio folder", e);
    return { error: e };
  }
};
