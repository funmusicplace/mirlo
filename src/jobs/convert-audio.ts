import { Job } from "bullmq";

import ffmpeg from "fluent-ffmpeg";
import {
  createReadStream,
  createWriteStream,
  promises as fsPromises,
} from "fs";
import { Stream } from "stream";

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

const generateDestination = (
  format: string,
  destinationFolder: string,
  audioBitrate?: string
) => {
  const fileName = `generated${
    audioBitrate ? "." + audioBitrate : ""
  }.${format}`;

  return `${destinationFolder}/${fileName}`;
};

const formats = [
  {
    format: "wav",
    // defaults to codec pcm_s16le
  },
  {
    format: "flac",
    audioCodec: "flac",
  },
  {
    format: "opus",
    audioCodec: "opus",
    audioBitrate: undefined,
  },
  {
    format: "mp3",
    audioCodec: "libmp3lame",
    audioBitrate: "128",
  },
  {
    format: "mp3",
    audioCodec: "libmp3lame",
    audioBitrate: "256",
  },
  {
    format: "mp3",
    audioCodec: "libmp3lame",
    audioBitrate: "320",
  },
];

export default async (job: Job) => {
  const { audioId } = job.data;

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

    logger.info(`Starting to optimize audio ${audioId}`);

    const probeStream = await minioClient.getObject(
      incomingAudioBucket,
      audioId
    );

    let fileType: string | undefined;
    let data: any;

    logger.info(
      `Processing with ffprobe to see if we can get duration ${audioId}`
    );

    await new Promise((resolve, reject) => {
      ffmpeg(probeStream).ffprobe(async (err, result) => {
        fileType = result?.format?.format_name;
        data = result;

        logger.info(`File type: ${JSON.stringify(fileType)}`);

        resolve(data);
      });
    });

    await new Promise(async (resolve, reject) => {
      const originalStream = await minioClient.getObject(
        incomingAudioBucket,
        audioId
      );

      const originalWritable = createWriteStream(
        `${destinationFolder}/original.${fileType}`
      ).on("close", () => {
        resolve(0);
      });
      originalStream.pipe(originalWritable);
    });

    const profiler = logger.startTimer();

    for (const formatDetails of formats) {
      await new Promise((resolve, reject) => {
        const { format, audioBitrate, audioCodec } = formatDetails;

        logger.info(`Processing stream for ${format}`);

        const destination = generateDestination(
          format,
          destinationFolder,
          audioBitrate
        );

        const processor = ffmpeg(
          createReadStream(`${destinationFolder}/original.${fileType}`)
        )
          .noVideo()
          .toFormat(format)
          .on("stderr", function (stderrLine) {
            // logger.info("Stderr output: " + stderrLine);
          })
          .on("error", (err: { message: unknown }) => {
            logger.error(`Error converting to ${format}: ${err.message}`);
            reject(err);
          })
          .on("end", () => {
            logger.info(`Done converting to ${format}`);
            resolve(null);
          });

        if (format === "mp3") {
          processor.addOptions("-write_xing", "0");
        }
        if (audioCodec) {
          processor.audioCodec(audioCodec);
        }
        if (audioBitrate) {
          processor.audioBitrate(audioBitrate);
        }

        processor.save(destination);
      });
    }

    const hlsStream = await minioClient.getObject(incomingAudioBucket, audioId);

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
          logger.info("Converting original to hls");
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
        .on("end", async (data) => {
          resolve(duration);
        })
        .save(`${destinationFolder}/playlist.m3u8`);
    });

    const finalFilesInFolder = await fsPromises.readdir(destinationFolder);

    await Promise.all(
      finalFilesInFolder.map(async (file) => {
        logger.info(`Uploading file ${file}`);
        const uploadStream = await createReadStream(
          `${destinationFolder}/${file}`
        );
        await minioClient.putObject(
          finalAudioBucket,
          `${audioId}/${file}`,
          uploadStream
        );
      })
    );

    profiler.done({ message: "Done converting to audio" });

    logger.info(`Done processing streams ${audioId}`);

    await minioClient.removeObject(incomingAudioBucket, audioId);
    await fsPromises.rm(destinationFolder, { recursive: true });
    logger.info(`Cleaned up ${destinationFolder}`);
    const response = { ...(data ?? {}), duration };
    logger.info(`Data: ${JSON.stringify(response)}`);
    return response;
  } catch (e) {
    logger.error("Error creating audio folder", e);
  }
};
