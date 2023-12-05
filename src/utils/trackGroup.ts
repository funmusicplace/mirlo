import { TrackGroup, TrackAudio, Track, TrackGroupCover } from "@prisma/client";
import prisma from "../../prisma/prisma";
import { convertURLArrayToSizes, generateFullStaticImageUrl } from "./images";
import { finalCoversBucket, finalAudioBucket, minioClient } from "./minio";
import { findArtistIdForURLSlug } from "./artist";
import { logger } from "../logger";
import fs, { promises as fsPromises } from "fs";
import archiver from "archiver";
import { deleteTrack } from "./tracks";
import { randomUUID } from "crypto";

const { MEDIA_LOCATION_DOWNLOAD_CACHE = "" } = process.env;

/**
 * We use our own custom function to handle this until we
 * can figure out a way to soft delete cascade. Maybe
 * we can't?
 *
 * @param trackGroupId
 */
export const deleteTrackGroup = async (
  trackGroupId: number,
  deleteAll?: boolean
) => {
  await prisma.trackGroup.delete({
    where: {
      id: Number(trackGroupId),
    },
  });

  if (deleteAll) {
    const tracks = await prisma.track.findMany({
      where: {
        trackGroupId,
      },
    });

    await Promise.all(tracks.map(async (track) => await deleteTrack(track.id)));

    await prisma.trackGroupCover.deleteMany({
      where: {
        trackGroupId: Number(trackGroupId),
      },
    });
  }
};

export const findTrackGroupIdForSlug = async (
  id: string,
  artistId?: string
) => {
  if (Number.isNaN(Number(id))) {
    if (!artistId) {
      throw new Error(
        "Searching for a TrackGroup by slug requires an artistId"
      );
    }
    const parsedArtistId = await findArtistIdForURLSlug(artistId);

    if (parsedArtistId) {
      const trackGroup = await prisma.trackGroup.findFirst({
        where: {
          urlSlug: { equals: id, mode: "insensitive" },
          artistId: parsedArtistId,
        },
      });
      id = `${trackGroup?.id ?? id}`;
    } else {
      logger.info(
        `findTrackGroupIdForSlug: returning undefined for id: ${id} artistId: ${artistId}`
      );
      return undefined;
    }
  }

  return id;
};

export default {
  cover: generateFullStaticImageUrl,
  single: (
    tg: TrackGroup & {
      cover?: TrackGroupCover | null;
      tracks?: Track[];
    }
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

export type FormatOptions =
  | "flac"
  | "wav"
  | "opus"
  | "320.mp3"
  | "256.mp3"
  | "128.mp3";

export async function buildZipFileForPath(
  tracks: (Track & {
    audio: TrackAudio | null;
  })[],
  folderName: string,
  format: FormatOptions = "flac"
) {
  return new Promise(async (resolve: (value: string) => void, reject) => {
    const rootFolder = `${MEDIA_LOCATION_DOWNLOAD_CACHE}/${folderName}`;
    const zipLocation = `${rootFolder}.${format}.zip`;
    try {
      const exists = await fsPromises.stat(zipLocation);
      if (exists) {
        logger.info(`${folderName}.${format}: exists at ${zipLocation}`);
        return resolve(zipLocation);
      }
    } catch (e) {
      logger.info(`${folderName}.${format}: No existing zip`);
    }

    const output = fs.createWriteStream(zipLocation);
    const archive = archiver("zip", {
      zlib: { level: 9 }, // Sets the compression level.
    });

    // listen for all archive data to be written
    // 'close' event is fired only when a file descriptor is involved
    output.on("close", function () {
      logger.info(archive.pointer() + " total bytes");
      logger.info(
        "archiver has been finalized and the output file descriptor has closed."
      );
      resolve(zipLocation);
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
        logger.info(
          `${track.audio.id}: Fetching file for tracks ${track.title}`
        );
        const order = track.order ? track.order : i + 1;
        const trackTitle = `${order} - ${track.title}.${format}`;

        const trackLocation = `${track.audio.id}/generated.${format}`;
        logger.info(`${track.audio.id}: Fetching ${trackLocation}`);
        try {
          const trackStream = await minioClient.getObject(
            finalAudioBucket,
            trackLocation
          );
          logger.info(`${track.audio.id}: Fetched file for tracks`);

          archive.append(trackStream, { name: trackTitle });
          logger.info(
            `${track.audio.id}: Added track to zip file ${track.title}`
          );
        } catch (e) {
          logger.error(`${track.audio.id}: File not found on MinIO skipping`);
        }
      }
    }
    logger.info("Done compiling zip, putting it on the filesystem");
    archive.finalize();
  });
}

export const registerPurchase = async ({
  userId,
  trackGroupId,
  pricePaid,
  currencyPaid,
  paymentProcessorKey,
}: {
  userId: number;
  pricePaid: number;
  currencyPaid: string;
  paymentProcessorKey: string;
  trackGroupId: number;
}) => {
  const token = randomUUID();

  let purchase = await prisma.userTrackGroupPurchase.findFirst({
    where: {
      userId: Number(userId),
      trackGroupId: Number(trackGroupId),
    },
  });
  if (purchase) {
    await prisma.userTrackGroupPurchase.update({
      where: {
        userId_trackGroupId: {
          userId: Number(userId),
          trackGroupId: Number(trackGroupId),
        },
      },
      data: {
        singleDownloadToken: token,
      },
    });
  }
  if (!purchase) {
    purchase = await prisma.userTrackGroupPurchase.create({
      data: {
        userId: Number(userId),
        trackGroupId: Number(trackGroupId),
        pricePaid,
        currencyPaid,
        stripeSessionKey: paymentProcessorKey,
        singleDownloadToken: token,
      },
    });
  }
  return purchase;
};
