import { TrackGroup, TrackAudio, Track, TrackGroupCover } from "@prisma/client";
import prisma from "../../prisma/prisma";
import { convertURLArrayToSizes, generateFullStaticImageUrl } from "./images";
import {
  finalCoversBucket,
  finalAudioBucket,
  getFileFromMinio,
  minioClient,
} from "./minio";
import { findArtistIdForURLSlug } from "./artist";
import JSZip, { folder } from "jszip";
import { logger } from "../logger";
import fs from "fs";
import archiver from "archiver";

const { MEDIA_LOCATION_DOWNLOAD_CACHE = "" } = process.env;
/**
 * We use our own custom function to handle this until we
 * can figure out a way to soft delete cascade. Maybe
 * we can't?
 *
 * @param trackGroupId
 */
export const deleteTrackGroup = async (trackGroupId: number) => {
  await prisma.trackGroup.delete({
    where: {
      id: Number(trackGroupId),
    },
  });

  const tracks = await prisma.track.findMany({
    where: {
      trackGroupId,
    },
  });

  await prisma.track.deleteMany({
    where: {
      trackGroupId: Number(trackGroupId),
    },
  });

  await prisma.track.deleteMany({
    where: {
      trackGroupId: Number(trackGroupId),
    },
  });

  await prisma.trackGroupCover.deleteMany({
    where: {
      trackGroupId: Number(trackGroupId),
    },
  });

  await prisma.trackAudio.deleteMany({
    where: {
      trackId: { in: tracks.map((t) => t.id) },
    },
  });
};

export const findTrackGroupIdForSlug = async (
  id: string,
  artistId?: string,
) => {
  if (Number.isNaN(Number(id))) {
    if (!artistId) {
      throw new Error(
        "Searching for a TrackGroup by slug requires an artistId",
      );
    }
    artistId = await findArtistIdForURLSlug(artistId);

    const artist = await prisma.trackGroup.findFirst({
      where: {
        urlSlug: { equals: id, mode: "insensitive" },
        artistId: Number(artistId),
      },
    });
    id = `${artist?.id ?? id}`;
  }
  return id;
};

export default {
  cover: generateFullStaticImageUrl,
  single: (
    tg: TrackGroup & {
      cover: TrackGroupCover | null;
      tracks?: Track[];
    },
  ) => ({
    ...tg,
    cover: {
      ...tg.cover,
      sizes: tg.cover
        ? convertURLArrayToSizes(tg.cover?.url, finalCoversBucket)
        : undefined,
    },
  }),
};

export async function buildZipFileForPath(
  tracks: (Track & {
    audio: TrackAudio | null;
  })[],
  folderName: string,
) {
  return new Promise(async (resolve: (value: string) => void, reject) => {
    const rootFolder = `${MEDIA_LOCATION_DOWNLOAD_CACHE}/${folderName}`;

    const output = fs.createWriteStream(`${rootFolder}.zip`);
    const archive = archiver("zip", {
      zlib: { level: 9 }, // Sets the compression level.
    });

    // listen for all archive data to be written
    // 'close' event is fired only when a file descriptor is involved
    output.on("close", function () {
      logger.info(archive.pointer() + " total bytes");
      logger.info(
        "archiver has been finalized and the output file descriptor has closed.",
      );
      resolve(`${rootFolder}.zip`);
    });
    // This event is fired when the data source is drained no matter what was the data source.
    // It is not part of this library but rather from the NodeJS Stream API.
    // @see: https://nodejs.org/api/stream.html#stream_event_end
    output.on("end", function () {
      logger.info("Data has been drained");
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
      throw err;
    });
    archive.pipe(output);

    for (let i = 0; i < tracks.length; i++) {
      const track = tracks[i];
      if (track.title && track.audio) {
        logger.info(`Fetching file for tracks ${track.title}`);
        const order = track.order ? track.order : i + 1;
        const trackTitle = `${order} - ${track.title}.${track.audio.fileExtension}`;

        const { filePath } = await getFileFromMinio(
          minioClient,
          finalAudioBucket,
          `${track.audio.id}/original.${track.audio.fileExtension}`,
          rootFolder,
          trackTitle,
          logger,
        );
        logger.info(`Fetched file for tracks ${filePath}`);

        archive.append(fs.createReadStream(filePath), { name: trackTitle });
        logger.info(`Added track to zip file ${track.title}`);
      }
    }
    logger.info("Done compiling zip, putting it on the filesystem");
    archive.finalize();
  });
}
