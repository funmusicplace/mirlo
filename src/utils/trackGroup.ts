import {
  TrackGroup,
  TrackAudio,
  Track,
  TrackGroupCover,
  Prisma,
  TrackGroupTag,
} from "@prisma/client";
import prisma from "../../prisma/prisma";
import { generateFullStaticImageUrl } from "./images";
import {
  finalCoversBucket,
  finalAudioBucket,
  minioClient,
  removeObjectsFromBucket,
} from "./minio";
import { addSizesToImage, findArtistIdForURLSlug } from "./artist";
import { logger } from "../logger";
import archiver from "archiver";
import { deleteTrack } from "./tracks";
import { randomUUID } from "crypto";
import { Response } from "express";
import { DefaultArgs } from "@prisma/client/runtime/library";
import { doesTrackGroupBelongToUser } from "./ownership";
import { AppError } from "./error";

export const whereForPublishedTrackGroups = (): Prisma.TrackGroupWhereInput => {
  return {
    published: true,
    tracks: { some: { audio: { uploadState: "SUCCESS" } } },
    deletedAt: null,
    cover: {
      url: {
        isEmpty: false,
      },
    },
  };
};

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
  let foundId: number | undefined = Number(id);
  if (Number.isNaN(foundId)) {
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
      foundId = trackGroup ? trackGroup.id : undefined;
    } else {
      logger.error(
        `findTrackGroupIdForSlug: returning undefined for id: ${id} artistId: ${artistId}`
      );
      return undefined;
    }
  } else {
    foundId = Number(id);
  }

  return foundId;
};

export const trackGroupSingleInclude = (options: {
  loggedInUserId?: number;
  ownerId?: number;
}): Prisma.TrackGroupInclude<DefaultArgs> => {
  return {
    tracks: {
      where: {
        deletedAt: null,
        ...(options.ownerId
          ? {}
          : {
              audio: {
                uploadState: "SUCCESS",
              },
            }),
      },
      include: {
        audio: true,
        trackArtists: true,
      },
      orderBy: { order: "asc" },
    },
    artist: true,
    tags: {
      include: { tag: true },
    },
    cover: { where: { deletedAt: null } },
    ...(options.loggedInUserId
      ? {
          userTrackGroupPurchases: {
            where: { userId: options.loggedInUserId },
            select: {
              userId: true,
            },
          },
          userTrackGroupWishlist: {
            where: { userId: options.loggedInUserId },
            select: {
              userId: true,
            },
          },
        }
      : {}),
  };
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
  paymentProcessorKey: string | null;
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

  if (purchase) {
    await prisma.userTrackGroupWishlist.deleteMany({
      where: {
        userId,
        trackGroupId,
      },
    });
  }

  const refreshedPurchase = await prisma.userTrackGroupPurchase.findFirst({
    where: {
      userId: Number(userId),
      trackGroupId: Number(trackGroupId),
    },
    include: {
      trackGroup: {
        include: {
          artist: true,
        },
      },
      user: {
        select: {
          email: true,
          id: true,
        },
      },
    },
  });

  if (refreshedPurchase) {
    await prisma.notification.create({
      data: {
        notificationType: "USER_BOUGHT_YOUR_ALBUM",
        userId: refreshedPurchase?.trackGroup.artist.userId,
        relatedUserId: Number(userId),
        trackGroupId: Number(trackGroupId),
        artistId: refreshedPurchase?.trackGroup.artistId,
      },
    });
  }
  return refreshedPurchase;
};

export const basicTrackGroupInclude = {
  include: {
    tracks: {
      include: {
        audio: true,
      },
      where: {
        deletedAt: null,
      },
    },
  },
};

export const findPurchaseAndVoidToken = async (
  trackGroupId: number,
  userId: number
) => {
  let isCreator;
  try {
    isCreator = await doesTrackGroupBelongToUser(Number(trackGroupId), userId);
  } catch (e) {}
  logger.info(`trackGroupId: ${trackGroupId} isCreator: ${isCreator}`);

  const purchase = await prisma.userTrackGroupPurchase.findFirst({
    where: {
      trackGroupId: Number(trackGroupId),
      ...(!isCreator
        ? {
            userId: Number(userId),
            trackGroup: {
              published: true,
            },
          }
        : {}),
    },
    include: {
      trackGroup: basicTrackGroupInclude,
    },
  });

  if (!purchase) {
    throw new AppError({
      httpCode: 404,
      description: `trackGroupId: ${trackGroupId} no purchase found`,
    });
  }

  // TODO: do we want a token to be reset after download?
  // If so we probably want to do this once the download is
  // complete on the client otherwise there might be errors
  // await setDownloadTokenToNull({
  //   userId: purchase.userId,
  //   trackGroupId: purchase.trackGroupId,
  // });

  return purchase;
};

export const findPurchaseBasedOnTokenAndUpdate = async (
  trackGroupId: number,
  token: string,
  userId?: number
) => {
  const purchase = await prisma.userTrackGroupPurchase.findFirst({
    where: {
      userId: userId,
      singleDownloadToken: token,
      trackGroupId: Number(trackGroupId),
      trackGroup: {
        published: true,
      },
    },
    include: {
      trackGroup: basicTrackGroupInclude,
    },
  });

  if (!purchase) {
    throw new AppError({
      httpCode: 404,
      description: `Trackgroup Purchase doesn't exist for ${trackGroupId}`,
    });
  }

  // TODO: do we want a token to be reset after download?
  // If so we probably want to do this once the download is
  // complete on the client otherwise there might be errors
  // await setDownloadTokenToNull({
  //   userId: user?.id,
  //   trackGroupId: Number(trackGroupId),
  // });

  return purchase.trackGroup;
};

export const setDownloadTokenToNull = async ({
  userId,
  trackGroupId,
}: {
  userId: number;
  trackGroupId: number;
}) => {
  await prisma.userTrackGroupPurchase.updateMany({
    data: {
      singleDownloadToken: null,
    },
    where: {
      userId: userId,
      trackGroupId: trackGroupId,
    },
  });
};

export const processSingleTrackGroup = (
  tg: TrackGroup & {
    cover?: TrackGroupCover | null;
    tracks?: Track[];
    tags?: (TrackGroupTag & { tag?: { tag?: string } })[];
  }
) => ({
  ...tg,
  tags: tg.tags?.map((t) => t.tag?.tag) ?? [],
  cover: addSizesToImage(finalCoversBucket, tg.cover),
});

export const processTrackGroupQueryOrder = (orderByString?: unknown) => {
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
