import { createReadStream, promises as fsPromises } from "fs";
import { PassThrough } from "stream";

import prisma from "@mirlo/prisma";
import {
  Artist,
  Track,
  TrackArtist,
  TrackAudio,
  TrackGroup,
  TrackGroupCover,
} from "@mirlo/prisma/client";
import archiver from "archiver";
import { Job } from "bullmq";
import filenamify from "filenamify";

import {
  downloadOriginalAudio,
  getDownloadableContentBuffer,
  getCoverBuffer,
  uploadZip,
} from "../utils/minio";
import { convertAudioToFormat } from "../utils/tracks";

import { logger } from "./queue-worker";

export type Format = {
  format: "mp3" | "wav" | "flac" | "opus" | "libmp3lame";
  audioCodec?: "flac" | "libmp3lame" | "opus" | "wav";
  audioBitrate?: "320" | "256" | "128";
};

const TEMP_LOCATION = process.env.TEMP_LOCATION;

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
  artist,
}: {
  tracks: (Track & { audio?: TrackAudio; trackArtists: TrackArtist[] })[];
  trackGroup: {
    title: string | null;
    coverLocation?: string;
    releaseDate?: Date | null;
    totalTracks?: number | null;
  };
  progress: number;
  job: Job;
  tempFolder: string;
  format: Format;
  artist: Artist;
}) => {
  let i = 0;

  for await (const track of tracks) {
    if (track.deletedAt) {
      logger.info(`trackId ${track.id}: Track is deleted, skipping conversion`);
      continue;
    }
    logger.info(`trackId ${track.id}: Processing track ${track.title}`);
    if (!track.audio) {
      logger.error(
        `trackId ${track.id}: No audio data found for track, skipping conversion`
      );
      continue;
    }
    const tempTrackPath = `${tempFolder}/${track.audio.id}-original.${track.audio.fileExtension}`;
    logger.info(`audioId ${track.audio.id}: Downloading to ${tempTrackPath}`);
    try {
      await downloadOriginalAudio(
        track.audio.id,
        track.audio.fileExtension ?? "mp3",
        tempTrackPath
      );
    } catch (e) {
      logger.error(
        `Error fetching original track: ${e}: ${track.audio.id}/original.${track.audio.fileExtension}`
      );
      await fsPromises.rm(tempTrackPath, { force: true });

      continue;
    }
    progress += (i * 70) / tracks.length;
    i += 1;
    await job.updateProgress(progress);
    logger.info(
      `audioId ${track.audio.id}: going to convert audio to format ${format.format}${format.audioBitrate ? `@${format.audioBitrate}` : ""}`
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
          },
          createReadStream(tempTrackPath),
          format,
          trackFileName,
          reject,
          resolve
        );
      } else {
        reject("No audio found for track, cannot convert");
      }
    });
    logger.info("Cleaning up audio files", tempTrackPath);
    await fsPromises.rm(tempTrackPath, { force: true });
  }
};

const zipFilesInFolder = async ({
  tempFolder,
  type,
  id,
  format,
}: {
  tempFolder: string;
  type: "track" | "trackGroup";
  id: number;
  format: string;
}) => {
  const profiler = logger.startTimer();

  await new Promise<void>(async (resolve, reject) => {
    const finalFilesInFolder = await fsPromises.readdir(tempFolder);

    logger.info(
      `zipFilesInFolder: ${tempFolder}: Zipping ${id}/${format}.zip: ${finalFilesInFolder.join(", ")}`
    );

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

    archive.on("error", function (err) {
      console.error("erroring", err);
      reject(err);
    });

    for (const file of finalFilesInFolder) {
      const uploadStream = createReadStream(`${tempFolder}/${file}`);
      const trackTitle = file;

      archive.append(uploadStream, { name: trackTitle });

      logger.info(`zipFilesInFolder: ${tempFolder}: Appending file ${file}`);
    }

    profiler.done({ message: "Done appending files" });

    const pass = new PassThrough();

    archive.pipe(pass);
    archive.finalize();
    try {
      await uploadZip(type, id, format, pass);

      logger.info(
        `zipFilesInFolder: ${tempFolder}: Cleaned up incoming bucket`
      );
      await fsPromises.rm(tempFolder, { recursive: true, force: true });
      logger.info(`Cleaned up ${tempFolder}`);
      resolve();
    } catch (e) {
      reject(e);
    }
  });
};

const downloadTrackGroupContent = async ({
  trackGroupId,
  contentDestination,
}: {
  trackGroupId: number;
  contentDestination: string;
}) => {
  logger.info(`downloadTrackGroupContent: ${trackGroupId}: Adding content`);

  try {
    const content = await prisma.downloadableContent.findMany({
      where: {
        trackGroups: {
          some: {
            trackGroupId,
          },
        },
      },
    });

    if (content.length === 0) {
      logger.info(
        `downloadTrackGroupContent: ${trackGroupId}: No downloadable content found`
      );
      return;
    }
    await Promise.all(
      content.map(async (item) => {
        logger.info(
          `downloadTrackGroupContent: ${trackGroupId}: Fetching content ${item.id}`
        );
        const { buffer } = await getDownloadableContentBuffer(item.id);

        if (buffer) {
          logger.info(
            `downloadTrackGroupContent: ${trackGroupId} writing content to disk`
          );
          const tempPath = `${contentDestination}/${filenamify(item.originalFilename ?? item.id)}`;
          await fsPromises.writeFile(tempPath, buffer);
        }
      })
    );
  } catch (e) {
    logger.error(
      `downloadTrackGroupContent: ${trackGroupId}: Error fetching content: ${e}`
    );
  }
};

const downloadCover = async ({
  coverId,
  coverDestination,
}: {
  coverId?: string;
  coverDestination: string;
}) => {
  let chosenCoverLocation: string | undefined;

  if (coverId) {
    logger.info(`downloadCover: ${coverId}: Adding cover`);

    try {
      const { buffer } = await getCoverBuffer(coverId, "webp");
      if (buffer) {
        await fsPromises.writeFile(coverDestination, buffer);
        chosenCoverLocation = coverDestination;
      }
    } catch (e) {
      logger.error(
        `downloadCover: ${coverId}: Error fetching cover in webp: ${e}`
      );
    }

    try {
      const { buffer: buffer2 } = await getCoverBuffer(coverId, "jpg");
      if (buffer2) {
        const jpgDestination = coverDestination.replace(".webp", ".jpg");
        await fsPromises.writeFile(jpgDestination, buffer2);
        // Prefer jpg for ffmpeg attached_pic compatibility.
        chosenCoverLocation = jpgDestination;
      }
    } catch (e) {
      logger.error(
        `downloadCover: ${coverId}: Error fetching cover in jpg: ${e}`
      );
    }
  }

  return chosenCoverLocation;
};

const downloadAndZipTracks = async ({
  formatString,
  tempFolder,
  tracks,
  trackGroup,
  job,
  artist,
  destinationType,
}: {
  formatString: string;
  tempFolder: string;
  tracks: (Track & { audio: TrackAudio; trackArtists: TrackArtist[] })[];
  trackGroup: {
    title: string | null;
    id: number;
    cover: TrackGroupCover;
    releaseDate?: Date | null;
  };
  job: Job;
  artist: Artist;
  destinationType: "track" | "trackGroup";
}) => {
  try {
    const format = parseFormat(formatString);
    logger.info(`downloadAndZipTracks: processing files for ${tempFolder}`);

    let progress = 10;
    const coverDestination = `${tempFolder}/cover.webp`;

    logger.info(`Checking if folder exists, if not creating it ${tempFolder}`);
    try {
      await fsPromises.stat(tempFolder);
    } catch (e) {
      await fsPromises.mkdir(tempFolder, { recursive: true });
    }
    logger.info(`Have folder locally ${tempFolder}`);

    const coverLocation = await downloadCover({
      coverId: trackGroup.cover.id,
      coverDestination,
    });

    await downloadTracks({
      tracks: tracks,
      progress,
      job,
      tempFolder,
      format,
      trackGroup: {
        title: trackGroup.title,
        coverLocation,
        releaseDate: trackGroup.releaseDate,
        totalTracks: tracks.filter((t) => !t.deletedAt).length,
      },
      artist,
    });

    logger.info(`Downloaded tracks ${tempFolder}`);

    await downloadTrackGroupContent({
      trackGroupId: trackGroup.id,
      contentDestination: tempFolder,
    });

    logger.info(`trackGroupId ${trackGroup.id}: Building zip`);

    const zipId = destinationType === "track" ? tracks[0].id : trackGroup.id;
    await zipFilesInFolder({
      tempFolder,
      type: destinationType,
      id: zipId,
      format: formatString,
    });

    await job.updateProgress(90);
  } catch (e) {
    logger.error(`Error building zip`);
    console.error(e);
  }
};

export default async (job: Job) => {
  const {
    trackGroup,
    format: formatString,
    tracks,
    destinationType = "trackGroup",
  } = job.data as {
    tracks: (Track & {
      audio: TrackAudio;
      trackArtists: TrackArtist[];
    })[];
    trackGroup: TrackGroup & {
      cover: TrackGroupCover;
    };
    format: string;
    destinationType: "track" | "trackGroup";
  };
  let tempFolder = `${TEMP_LOCATION}trackGroup/${trackGroup.id}/${formatString}`;

  if (destinationType === "track") {
    tempFolder = `${TEMP_LOCATION}track/${tracks[0].id}/${formatString}`;
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
      destinationType,
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
