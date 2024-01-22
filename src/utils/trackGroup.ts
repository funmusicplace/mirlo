import {
  TrackGroup,
  TrackAudio,
  Track,
  TrackGroupCover,
  Prisma,
} from "@prisma/client";
import prisma from "../../prisma/prisma";
import { convertURLArrayToSizes, generateFullStaticImageUrl } from "./images";
import {
  finalCoversBucket,
  finalAudioBucket,
  minioClient,
  removeObjectsFromBucket,
} from "./minio";
import { findArtistIdForURLSlug } from "./artist";
import { logger } from "../logger";
import archiver from "archiver";
import { deleteTrack } from "./tracks";
import { randomUUID } from "crypto";
import { Response } from "express";

const { MEDIA_LOCATION_DOWNLOAD_CACHE = "" } = process.env;

export const deleteTrackGroupCover = async (trackGroupId: number) => {
  const cover = await prisma.trackGroupCover.findFirst({
    where: {
      trackGroupId: trackGroupId,
    },
  });

  if (cover) {
    await prisma.trackGroupCover.delete({
      where: {
        trackGroupId: trackGroupId,
      },
    });

    try {
      removeObjectsFromBucket(finalCoversBucket, cover.id);
    } catch (e) {
      console.error("Found no files, that's okay");
    }
  }
};

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
  await deleteTrackGroupCover(Number(trackGroupId));

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
  format: FormatOptions = "flac",
  res: Response
) {
  return new Promise(async (resolve: (value?: unknown) => void, reject) => {
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
      throw err;
    });

    archive.on("finish", () => {
      resolve();
    });

    archive.pipe(res);

    for (let i = 0; i < tracks.length; i++) {
      const track = tracks[i];
      if (track.title && track.audio) {
        logger.info(
          `${track.audio.id}: Fetching file for tracks ${track.title}`
        );
        const order = track.order ? track.order : i + 1;
        const trackTitle = `${order} - ${track.title}.${format}`;

        const trackLocation = `${track.audio.id}/original.${track.audio.fileExtension}`;
        logger.info(`${track.audio.id}: Fetching ${trackLocation}`);
        try {
          const trackStream = await minioClient.getObject(
            finalAudioBucket,
            trackLocation
          );

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

export const processSingleTrackGroup = (
  tg: TrackGroup & {
    cover?: TrackGroupCover | null;
    tracks?: Track[];
  }
) => ({
  ...tg,
  cover: tg.cover
    ? {
        ...tg.cover,
        sizes: tg.cover
          ? convertURLArrayToSizes(tg.cover?.url, finalCoversBucket)
          : undefined,
      }
    : null,
});

export const processTrackGroupQueryOrder = (orderByString?: string) => {
  let orderByObj: Prisma.TrackGroupOrderByWithRelationAndSearchRelevanceInput =
    {
      releaseDate: "desc",
    };
  if (orderByString === "random") {
  } else if (orderByString === "id") {
    orderByObj = {
      id: "desc",
    };
  } else if (orderByString === "createdAt") {
    orderByObj = {
      createdAt: "desc",
    };
  }
  return orderByObj;
};

export default {
  cover: generateFullStaticImageUrl,
  single: processSingleTrackGroup,
};
