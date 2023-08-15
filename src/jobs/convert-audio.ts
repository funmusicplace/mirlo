import { Job } from "bullmq";

import path from "path";
import ffmpeg from "fluent-ffmpeg";
import { promises as fsPromises } from "fs";
import { fromBuffer } from "file-type";

import { logger } from "./queue-worker";
import {
  createBucketIfNotExists,
  finalAudioBucket,
  getBufferFromMinio,
  incomingAudioBucket,
  minioClient,
} from "../utils/minio";
import { Readable } from "stream";

const {
  MINIO_HOST = "",
  MINIO_ROOT_USER = "",
  MINIO_API_PORT = 9000,
} = process.env;

export default async (job: Job) => {
  const { audioId } = job.data;

  try {
    const destinationFolder = `/data/media/processing/${audioId}`;

    logger.info(
      `MinIO is at ${MINIO_HOST}:${MINIO_API_PORT} ${MINIO_ROOT_USER}`
    );

    logger.info(`Starting to optimize audio ${audioId}`);
    const { buffer } = await getBufferFromMinio(
      minioClient,
      incomingAudioBucket,
      audioId,
      logger
    );

    await createBucketIfNotExists(minioClient, finalAudioBucket, logger);

    logger.info(
      `checking if folder exists, if not creating it ${destinationFolder}`
    );
    try {
      await fsPromises.stat(destinationFolder);
    } catch (e) {
      await fsPromises.mkdir(destinationFolder, { recursive: true });
    }

    const fileType = await fromBuffer(buffer);

    await fsPromises.writeFile(
      `${destinationFolder}/original.${fileType?.ext ?? "flac"}`,
      buffer
    );

    const profiler = logger.startTimer();
    await new Promise((resolve, reject) => {
      ffmpeg(Readable.from(buffer))
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
          logger.info("Converting original to hls");
        })
        .on("error", (err: { message: unknown }) => {
          logger.error(err.message);
          reject(err);
        })
        .on("end", async () => {
          profiler.done({ message: "Done converting to m3u8" });

          // // FIXME: should this point to the trim track?
          // const stat = await fsPromises.stat(
          //   path.join(`${audioId}/playlist.m3u8`)
          // );

          // return resolve(stat);
          resolve(true);
        })
        .save(path.join(`${destinationFolder}/playlist.m3u8`));
    });
    logger.info("Done creating audio folder, starting upload to MinIO");

    const finalFilesInFolder = await fsPromises.readdir(destinationFolder);

    logger.info(`finalFilesInFolder: ${finalFilesInFolder.join(", ")}`);

    await Promise.all(
      finalFilesInFolder.map(async (file) => {
        logger.info(`Uploading file ${file}`);
        await minioClient.fPutObject(
          finalAudioBucket,
          `${audioId}/${file}`,
          `${destinationFolder}/${file}`
        );
      })
    );

    await minioClient.removeObject(incomingAudioBucket, audioId);
    await fsPromises.rm(destinationFolder, { recursive: true });
  } catch (e) {
    logger.error("Error creating audio folder", e);
  }

  // const result = await Promise.all([

  // Don't think we need to store trimmed tracks.
  // new Promise((resolve, reject) => {
  //   const profiler = logger.startTimer();

  //   return (
  //     ffmpeg(path.join(BASE_DATA_DIR, `/data/media/incoming/${filename}`))
  //       .noVideo()
  //       .outputOptions("-movflags", "+faststart")
  //       .inputOptions("-t", "45")
  //       .addOption("-start_number", "0") // start the first .ts segment at index 0
  //       .addOption("-hls_time", "10") // 10 second segment duration
  //       .addOption("-hls_list_size", "0") // Maxmimum number of playlist entries (0 means all entries/infinite)
  //       // .addOption('-strftime_mkdir', 1)
  //       // .addOption('-use_localtime_mkdir', 1)
  //       .addOption(
  //         "-hls_segment_filename",
  //         `${destinationFolder}/trim-%03d.ts`
  //       )
  //       .addOption("-f", "hls") // HLS format
  //       .audioChannels(2)
  //       .audioBitrate("320k")
  //       .audioFrequency(48000)
  //       .audioCodec("libfdk_aac") // convert using Fraunhofer FDK AAC
  //       .on("start", () => {
  //         logger.info("Converting original to hls and trimming");
  //       })
  //       .on("error", (err: { message: unknown }) => {
  //         logger.error(err.message);
  //         return reject(err);
  //       })
  //       .on("end", async () => {
  //         profiler.done({
  //           message: "Done converting and trimming to m3u8",
  //         });

  //         // FIXME: should this point to the trim track?
  //         const stat = await fsPromises.stat(
  //           path.join(
  //             BASE_DATA_DIR,
  //             `${destinationFolder}/trim-playlist.m3u8`
  //           )
  //         );

  //         return resolve(stat);
  //       })
  //       .save(
  //         path.join(
  //           BASE_DATA_DIR,
  //           `${destinationFolder}/trim-playlist.m3u8`
  //         )
  //       )
  //   );
  // }),
  // ]);
  //   return Promise.resolve(result);
  // } catch (err) {
  //   return Promise.reject(err);
  // }
};
