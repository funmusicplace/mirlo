import { Job } from "bullmq";

import path from "path";
import ffmpeg from "fluent-ffmpeg";
import fs, { promises as fsPromises } from "fs";
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

// FIXME: Convert this to be stream based.
export default async (job: Job) => {
  const { audioId } = job.data;

  try {
    const destinationFolder = `/data/media/processing/${audioId}`;

    logger.info(
      `MinIO is at ${MINIO_HOST}:${MINIO_API_PORT} ${MINIO_ROOT_USER}`,
    );

    logger.info(`Starting to optimize audio ${audioId}`);
    const { buffer } = await getBufferFromMinio(
      minioClient,
      incomingAudioBucket,
      audioId,
      logger,
    );

    await createBucketIfNotExists(minioClient, finalAudioBucket, logger);

    logger.info(
      `checking if folder exists, if not creating it ${destinationFolder}`,
    );
    try {
      await fsPromises.stat(destinationFolder);
    } catch (e) {
      await fsPromises.mkdir(destinationFolder, { recursive: true });
    }

    const fileType = await fromBuffer(buffer);

    await fsPromises.writeFile(
      `${destinationFolder}/original.${fileType?.ext ?? "flac"}`,
      buffer,
    );

    const profiler = logger.startTimer();

    const data = await new Promise((resolve, reject) => {
      ffmpeg(Readable.from(buffer)).ffprobe((err, data) => {
        resolve(data);
      });
    });

    if (fileType?.ext !== "wav") {
      await new Promise((resolve, reject) => {
        ffmpeg(Readable.from(buffer))
          .toFormat("wav")
          .on("error", (err: { message: unknown }) => {
            logger.error(err.message);
          })
          .on("end", (err: { message: unknown }) => {
            logger.info("Done converting to wav");
            resolve("done");
          })
          .save(path.join(`${destinationFolder}/generated.wav`));
      });
    }

    if (fileType?.ext !== "flac") {
      await new Promise((resolve, reject) => {
        ffmpeg(Readable.from(buffer))
          .toFormat("flac")
          .audioCodec("flac")
          .on("error", (err: { message: unknown }) => {
            logger.error(err.message);
          })
          .on("end", (err: { message: unknown }) => {
            logger.info("Done converting to flac");
            resolve("done");
          })
          .save(path.join(`${destinationFolder}/generated.flac`));
      });
    }

    if (fileType?.ext !== "opus") {
      await new Promise((resolve, reject) => {
        ffmpeg(Readable.from(buffer))
          .noVideo()
          .outputOptions("-movflags", "+faststart", "-f", "ipod")
          .toFormat("opus")
          .audioCodec("opus")
          .on("error", (err: { message: unknown }) => {
            logger.error(err.message);
          })
          .on("end", (err: { message: unknown }) => {
            logger.info("Done converting to opus");
            resolve("done");
          })
          .save(path.join(`${destinationFolder}/generated.opus`));
      });
    }

    await new Promise((resolve, reject) => {
      ffmpeg(Readable.from(buffer))
        .noVideo()
        .toFormat("mp3")
        .audioCodec("libmp3lame")
        .audioBitrate("128")
        .on("error", (err: { message: unknown }) => {
          logger.error(err.message);
        })
        .on("end", () => {
          logger.info("Done converting to mp3@128");
          resolve("done");
        })
        .save(path.join(`${destinationFolder}/generated-128.mp3`));
    });

    await new Promise((resolve, reject) => {
      ffmpeg(Readable.from(buffer))
        .noVideo()
        .toFormat("mp3")
        .audioCodec("libmp3lame")
        .audioBitrate("256")
        .on("error", (err: { message: unknown }) => {
          logger.error(err.message);
        })
        .on("end", () => {
          logger.info("Done converting to mp3@256");
          resolve("done");
        })
        .save(path.join(`${destinationFolder}/generated-256.mp3`));
    });

    await new Promise((resolve, reject) => {
      ffmpeg(Readable.from(buffer))
        .noVideo()
        .toFormat("mp3")
        .audioCodec("libmp3lame")
        .audioBitrate("320")
        .on("error", (err: { message: unknown }) => {
          logger.error(err.message);
        })
        .on("end", () => {
          logger.info("Done converting to mp3@320");
          resolve("done");
        })
        .save(path.join(`${destinationFolder}/generated-320.mp3`));
    });

    const duration = await new Promise((resolve, reject) => {
      let duration = 0;
      ffmpeg(Readable.from(buffer))
        .noVideo()
        .outputOptions("-movflags", "+faststart")
        .addOption("-start_number", "0") // start the first .ts segment at index 0
        .addOption("-hls_time", "10") // 10 second segment duration
        .addOption("-hls_list_size", "0") // Maxmimum number of playlist entries (0 means all entries/infinite)
        .addOption(
          "-hls_segment_filename",
          `${destinationFolder}/segment-%03d.ts`,
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
        .on("progress", (data: { timemark: string }) => {
          if (data.timemark.includes(":")) {
            const timeArray = data.timemark.split(":");
            duration =
              Math.round(+timeArray[0]) * 60 * 60 +
              Math.round(+timeArray[1]) * 60 +
              Math.round(+timeArray[2]);
          }
        })
        .on("end", async (data) => {
          profiler.done({ message: "Done converting to m3u8" });

          resolve(duration);
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
          `${destinationFolder}/${file}`,
        );
      }),
    );

    await minioClient.removeObject(incomingAudioBucket, audioId);
    await fsPromises.rm(destinationFolder, { recursive: true });
    return {
      duration,
      ...(typeof data === "object" ? data : {}),
    };
  } catch (e) {
    logger.error("Error creating audio folder", e);
  }
};
