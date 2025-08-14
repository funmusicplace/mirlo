import { Job } from "bullmq";

import { createReadStream, promises as fsPromises } from "fs";

import { logger } from "./queue-worker";
import {
  createBucketIfNotExists,
  finalAudioBucket,
  finalCoversBucket,
  getBufferFromStorage,
  getFile,
  trackFormatBucket,
  trackGroupFormatBucket,
  uploadWrapper,
} from "../utils/minio";
import { convertAudioToFormat } from "../utils/tracks";
import archiver from "archiver";
import { PassThrough } from "stream";
import {
  Artist,
  Track,
  TrackArtist,
  TrackAudio,
  TrackGroup,
  TrackGroupCover,
} from "@mirlo/prisma/client";
import filenamify from "filenamify";
import prisma from "@mirlo/prisma";

export type Format = {
  format: "mp3" | "wav" | "flac" | "opus" | "libmp3lame";
  audioCodec?: "flac" | "libmp3lame" | "opus" | "wav";
  audioBitrate?: "320" | "256" | "128";
};

const parseFormat = (format: string): Format => {
  const split = format.split(".");
  const form = split[split.length - 1] as "wav" | "mp3" | "flac" | "opus";
  const codec =
    form === "mp3"
      ? "libmp3lame"
      : form === "wav"
        ? undefined
        : (form as "flac" | "libmp3lame" | "opus");
  const bitrate =
    form === "mp3" || form === "opus"
      ? (split[0] as "320" | "256" | "128")
      : undefined;

  return {
    format: form,
    audioCodec: codec,
    audioBitrate: bitrate,
  };
};

const downloadTracks = async ({
  tracks,
  progress,
  job,
  tempFolder,
  format,
  trackGroup,
  coverDestination,
  artist,
}: {
  tracks: (Track & { audio?: TrackAudio; trackArtists: TrackArtist[] })[];
  trackGroup: { title: string | null };
  progress: number;
  job: Job;
  tempFolder: string;
  coverDestination: string;
  format: Format;
  artist: Artist;
}) => {
  let i = 0;

  for await (const track of tracks) {
    logger.info(`trackId ${track.id}: Processing track ${track.title}`);
    if (!track.audio) {
      logger.error(
        `trackId ${track.id}: No audio data found for track, skipping conversion`
      );
      continue;
    }
    const originalTrackLocation = `${track.audio.id}/original.${track.audio.fileExtension}`;
    logger.info(`audioId ${track.audio.id}: Fetching ${originalTrackLocation}`);
    const tempTrackPath = `${tempFolder}/original.${track.audio.fileExtension}`;

    try {
      await getFile(finalAudioBucket, originalTrackLocation, tempTrackPath);
    } catch (e) {
      logger.error(
        `Error fetching original track: ${e}: ${originalTrackLocation}`
      );
      await fsPromises.rm(tempTrackPath, { force: true });

      continue;
    }
    progress += (i * 70) / tracks.length;
    i += 1;
    await job.updateProgress(progress);
    logger.info(
      `audioId ${track.audio.id}: Getting artist for trackGroup ${originalTrackLocation}`
    );

    await new Promise((resolve, reject) => {
      const trackFileName = `${tempFolder}/${track.order ?? i}-${filenamify(track.title ?? "")}`;

      if (track.audio) {
        logger.info(
          `audioId ${track.audio.id}: Processing stream for ${format.format}${
            format.audioBitrate
              ? `@${format.audioBitrate} to ${trackFileName}`
              : ""
          }`
        );

        convertAudioToFormat(
          {
            track,
            artist,
            trackGroup,
            coverLocation: coverDestination,
          },
          createReadStream(tempTrackPath),
          format,
          trackFileName,
          reject,
          resolve
        );
      }
    });
    await fsPromises.rm(tempTrackPath, { force: true });
  }
};

const zipFilesInFolder = async ({
  tempFolder,
  zipFileName,
  destinationBucket,
}: {
  tempFolder: string;
  zipFileName: string;
  destinationBucket: string;
}) => {
  const profiler = logger.startTimer();

  await new Promise(async (resolve: (value?: unknown) => void) => {
    const finalFilesInFolder = await fsPromises.readdir(tempFolder);

    const archive = archiver("zip", {
      zlib: { level: 9 }, // Sets the compression level.
      forceLocalTime: true, // Workaround for UTF-8 support for filenames
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

      logger.info(`zipFilesInFolder: ${tempFolder}: Appending file ${file}`);
    }

    profiler.done({ message: "Done appending files" });

    const pass = new PassThrough();

    archive.pipe(pass);
    archive.finalize();

    await uploadWrapper(destinationBucket, zipFileName, pass);

    logger.info(`zipFilesInFolder: ${tempFolder}: Cleaned up incoming bucket`);
    await fsPromises.rm(tempFolder, { recursive: true, force: true });
    logger.info(`Cleaned up ${tempFolder}`);
  });
};

const downloadCover = async ({
  coverId,
  coverDestination,
}: {
  coverId?: string;
  coverDestination: string;
}) => {
  if (coverId) {
    logger.info(`downloadCover: ${coverId}: Adding cover`);

    const { buffer } = await getBufferFromStorage(
      finalCoversBucket,
      `${coverId}-x1500.webp`
    );
    if (buffer) {
      await fsPromises.writeFile(coverDestination, buffer);
    }
  }
};

const downloadAndZipTracks = async ({
  formatString,
  tempFolder,
  tracks,
  trackGroup,
  job,
  artist,
  destinationBucket,
}: {
  formatString: string;
  tempFolder: string;
  tracks: (Track & { audio: TrackAudio; trackArtists: TrackArtist[] })[];
  trackGroup: {
    title: string | null;
    id: number;
    cover: TrackGroupCover;
  };
  job: Job;
  artist: Artist;
  destinationBucket: DestinationBucket;
}) => {
  try {
    const format = parseFormat(formatString);
    logger.info(`downloadAndZipTracks: processing files for ${tempFolder}`);

    let progress = 10;
    const coverDestination = `${tempFolder}/cover.webp`;

    await createBucketIfNotExists(destinationBucket, logger);

    logger.info(`Checking if folder exists, if not creating it ${tempFolder}`);
    try {
      await fsPromises.stat(tempFolder);
    } catch (e) {
      await fsPromises.mkdir(tempFolder, { recursive: true });
    }
    logger.info(`Have folder locally ${tempFolder}`);

    await downloadTracks({
      tracks: tracks,
      progress,
      job,
      tempFolder,
      format,
      trackGroup,
      coverDestination,
      artist,
    });
    logger.info(`Downloaded tracks ${tempFolder}`);

    await downloadCover({
      coverId: trackGroup.cover.id,
      coverDestination,
    });
    logger.info(`trackGroupId ${trackGroup.id}: Building zip`);

    await zipFilesInFolder({
      tempFolder,
      zipFileName: `${destinationBucket === trackFormatBucket ? tracks[0].id : trackGroup.id}/${formatString}.zip`,
      destinationBucket,
    });

    await job.updateProgress(90);
  } catch (e) {
    logger.error(`Error building zip`);
    console.error(e);
  }
};

type DestinationBucket =
  | typeof trackFormatBucket
  | typeof trackGroupFormatBucket;

export default async (job: Job) => {
  const {
    trackGroup,
    format: formatString,
    tracks,
    destinationBucket,
  } = job.data as {
    tracks: (Track & {
      audio: TrackAudio;
      trackArtists: TrackArtist[];
    })[];
    trackGroup: TrackGroup & {
      cover: TrackGroupCover;
    };
    format: string;
    destinationBucket: DestinationBucket;
  };
  let tempFolder = `/data/media/trackGroup/${trackGroup.id}`;

  if (destinationBucket === "track-format") {
    tempFolder = `/data/media/track/${tracks[0].id}`;
  }

  try {
    const artist = await prisma.artist.findFirst({
      where: { id: trackGroup.artistId },
    });

    if (!artist) {
      throw "Couldn't find artist, weird";
    }

    await downloadAndZipTracks({
      formatString,
      tempFolder,
      tracks,
      trackGroup,
      job,
      artist,
      destinationBucket,
    });
  } catch (e) {
    logger.error(`Error creating zip of tracks folder: ${tempFolder}`);
    if (e instanceof Error) {
      logger.error(`${e.message}: ${e.stack?.toString()}`);
    }
    await fsPromises.rm(tempFolder, { recursive: true, force: true });

    return { error: e };
  }
};
