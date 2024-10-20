import { Job } from "bullmq";

import { createReadStream, promises as fsPromises } from "fs";

import { logger } from "./queue-worker";
import {
  createBucketIfNotExists,
  finalAudioBucket,
  finalCoversBucket,
  minioClient,
  trackGroupFormatBucket,
} from "../utils/minio";
import { convertAudioToFormat } from "../utils/tracks";
import archiver from "archiver";
import { PassThrough } from "stream";
import {
  Track,
  TrackArtist,
  TrackAudio,
  TrackGroup,
  TrackGroupCover,
} from "@mirlo/prisma/client";
import filenamify from "filenamify";
import prisma from "@mirlo/prisma";

const {
  MINIO_HOST = "",
  MINIO_ROOT_USER = "",
  MINIO_API_PORT = 9000,
} = process.env;

const parseFormat = (format: string) => {
  const split = format.split(".");
  const form = split[split.length - 1] as "wav" | "mp3" | "flac" | "opus";
  const codec =
    form === "mp3"
      ? "libmp3lame"
      : form === "wav"
        ? undefined
        : (form as "flac" | "libmp3lame" | "opus");
  const bitrate =
    form === "mp3" ? (split[0] as "320" | "256" | "128") : undefined;

  return {
    format: form,
    audioCodec: codec,
    audioBitrate: bitrate,
  };
};

export default async (job: Job) => {
  const { trackGroup, format: formatString } = job.data as {
    trackGroup: TrackGroup & {
      tracks: (Track & { audio: TrackAudio; trackArtists: TrackArtist[] })[];
      cover: TrackGroupCover;
    };
    format: string;
  };
  const format = parseFormat(formatString);
  logger.info(
    `trackGroupId: ${trackGroup.id} \t generating trackgroup for ${format.format}`
  );

  let progress = 10;
  const tempFolder = `/data/media/trackGroup/${trackGroup.id}`;
  logger.info(`MinIO is at ${MINIO_HOST}:${MINIO_API_PORT} ${MINIO_ROOT_USER}`);

  try {
    await createBucketIfNotExists(minioClient, trackGroupFormatBucket, logger);

    logger.info(`Checking if folder exists, if not creating it ${tempFolder}`);
    try {
      await fsPromises.stat(tempFolder);
    } catch (e) {
      await fsPromises.mkdir(tempFolder, { recursive: true });
    }

    const profiler = logger.startTimer();

    let i = 0;
    for await (const track of trackGroup.tracks) {
      const minioTrackLocation = `${track.audio.id}/original.${track.audio.fileExtension}`;
      logger.info(`audioId ${track.audio.id}: Fetching ${minioTrackLocation}`);
      const originalTrackPath = `${tempFolder}/original.${track.audio.fileExtension}`;

      await minioClient.fGetObject(
        finalAudioBucket,
        minioTrackLocation,
        originalTrackPath
      );
      progress += (i * 70) / trackGroup.tracks.length;
      i += 1;
      await job.updateProgress(progress);

      const artist = await prisma.artist.findFirst({
        where: { id: trackGroup.artistId },
      });

      if (!artist) {
        throw "Couldn't find artist, weird";
      }

      await new Promise((resolve, reject) => {
        logger.info(
          `audioId ${track.audio.id}: Processing stream for ${format.format}${
            format.audioBitrate ? `@${format.audioBitrate}` : ""
          }`
        );

        convertAudioToFormat(
          { track, artist, trackGroup },
          createReadStream(originalTrackPath),
          format,
          `${tempFolder}/${track.order ?? i}-${filenamify(track.title ?? "")}`,
          reject,
          resolve
        );
      });

      await fsPromises.rm(originalTrackPath, { force: true });
    }

    await job.updateProgress(90);

    if (trackGroup.cover?.id) {
      logger.info("Adding cover");
      await minioClient.fGetObject(finalCoversBucket, `${trackGroup.cover.id}-x1500.jpg`, `${tempFolder}/cover.jpg`);
    }

    await new Promise(async (resolve: (value?: unknown) => void, reject) => {
      const finalFilesInFolder = await fsPromises.readdir(tempFolder);

      const archive = archiver("zip", {
        zlib: { level: 9 }, // Sets the compression level.
      });

      // good practice to catch warnings (ie stat failures and other non-blocking errors)
      archive.on("warning", function (err) {
        if (err.code === "ENOENT") {
          // log warning
        } else {
          // throw error
          throw err;
        }
      });

      // good practice to catch this error explicitly
      archive.on("error", function (err) {
        console.error("erroring", err);
        throw err;
      });

      archive.on("finish", () => {
        resolve();
      });

      for await (const file of finalFilesInFolder) {
        const uploadStream = await createReadStream(`${tempFolder}/${file}`);
        const trackTitle = file;

        archive.append(uploadStream, { name: trackTitle });

        logger.info(`trackGroupId: ${trackGroup.id}: Appending file ${file}`);
      }

      profiler.done({ message: "Done appending files" });

      const pass = new PassThrough();

      archive.pipe(pass);
      archive.finalize();

      await minioClient.putObject(
        trackGroupFormatBucket,
        `${trackGroup.id}/${formatString}.zip`,
        pass
      );

      logger.info(
        `trackGroupId ${trackGroup.id}: Cleaned up incoming minio folder`
      );
      await fsPromises.rm(tempFolder, { recursive: true, force: true });
      logger.info(`Cleaned up ${tempFolder}`);
    });
  } catch (e) {
    await fsPromises.rm(tempFolder, { recursive: true, force: true });
    logger.error("Error creating audio folder", e);
    return { error: e };
  }
};
