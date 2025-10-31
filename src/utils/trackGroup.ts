import {
  TrackGroup,
  TrackAudio,
  Track,
  TrackGroupCover,
  Prisma,
  TrackGroupTag,
  User,
  Merch,
  MerchImage,
  Artist,
  ArtistAvatar,
  UploadState,
} from "@mirlo/prisma/client";
import prisma from "@mirlo/prisma";
import { generateFullStaticImageUrl } from "./images";
import {
  finalCoversBucket,
  finalAudioBucket,
  removeObjectsFromBucket,
  getReadStream,
  finalArtistAvatarBucket,
  downloadableContentBucket,
} from "./minio";
import { addSizesToImage, findArtistIdForURLSlug } from "./artist";
import { logger } from "../logger";
import archiver from "archiver";
import { deleteTrack } from "./tracks";
import { randomUUID } from "crypto";
import { Response } from "express";
import { DefaultArgs } from "@prisma/client/runtime/library";
import { doesTrackBelongToUser, doesTrackGroupBelongToUser } from "./ownership";
import { AppError } from "./error";
import { processSingleMerch } from "./merch";
import { sendBasecampAMessage } from "./basecamp";
import downloadableContent from "../routers/v1/manage/downloadableContent";
import { deleteDownloadableContent } from "./content";

export const whereForPublishedTrackGroups = (): Prisma.TrackGroupWhereInput => {
  return {
    OR: [{ published: true }, { publishedAt: { lte: new Date() } }],
    isDrafts: false,
    adminEnabled: true,
    artist: {
      enabled: true,
    },
    hideFromSearch: false,
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

  await prisma.trackGroupPledge.deleteMany({
    where: {
      trackGroupId,
    },
  });

  await prisma.trackGroupTag.deleteMany({
    where: {
      trackGroupId,
    },
  });

  const downloadableContents =
    await prisma.trackGroupDownloadableContent.findMany({
      where: {
        trackGroupId,
      },
    });

  await Promise.all(
    downloadableContents.map((dc) =>
      deleteDownloadableContent(dc.downloadableContentId)
    )
  );

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
  trackGroupIdOrSlug: string,
  artistId?: string
) => {
  let foundtrackGroupId: number | undefined = Number(trackGroupIdOrSlug);

  if (
    Number.isNaN(foundtrackGroupId) ||
    (Number.isFinite(+foundtrackGroupId) && artistId)
  ) {
    if (!artistId) {
      throw new Error(
        "Searching for a TrackGroup by slug requires an artistId"
      );
    }
    const parsedArtistId = await findArtistIdForURLSlug(artistId);

    if (parsedArtistId) {
      const trackGroup = await prisma.trackGroup.findFirst({
        where: {
          urlSlug: { equals: trackGroupIdOrSlug, mode: "insensitive" },
          artistId: parsedArtistId,
        },
      });
      foundtrackGroupId = trackGroup ? trackGroup.id : undefined;
    } else {
      logger.info(
        `findTrackGroupIdForSlug: returning undefined for trackGroupId: ${trackGroupIdOrSlug}, artistId: ${artistId}`
      );
      return undefined;
    }
  } else {
    foundtrackGroupId = Number(trackGroupIdOrSlug);
  }

  return foundtrackGroupId;
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
        license: true,
      },
      orderBy: { order: "asc" },
    },
    paymentToUser: {
      select: {
        id: true,
        name: true,
        urlSlug: true,
        userAvatar: true,
      },
    },
    downloadableContent: {
      include: {
        downloadableContent: true,
      },
    },
    artist: true,
    merch: {
      include: {
        images: true,
      },
    },
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
          const trackStream = await getReadStream(
            finalAudioBucket,
            trackLocation
          );

          if (trackStream) {
            archive.append(trackStream, { name: trackTitle });
            logger.info(
              `${track.audio.id}: Added track to zip file ${track.title}`
            );
          } else {
            logger.error(
              `${track.audio.id}: File not found on backend storage skipping`
            );
          }
        } catch (e) {
          logger.error(
            `${track.audio.id}: File not found on backend storage skipping`
          );
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
  message,
  currencyPaid,
  paymentProcessorKey,
  platformCut = null,
  transactionId,
}: {
  userId: number;
  pricePaid: number;
  currencyPaid: string;
  message?: string | null;
  paymentProcessorKey: string | null;
  trackGroupId: number;
  platformCut?: number | null;
  transactionId?: string | null;
}) => {
  const token = randomUUID();
  logger.info(
    `registerPurchase: userId: ${userId}, trackGroupId: ${trackGroupId}, pricePaid: ${pricePaid}, currencyPaid: ${currencyPaid}, paymentProcessorKey: ${paymentProcessorKey}, platformCut: ${platformCut}, message: ${message}`
  );

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
        message: message ?? null,
        singleDownloadToken: token,
        userTransactionId: transactionId,
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
      transaction: true,
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

export const registerTrackPurchase = async ({
  userId,
  trackId,
  pricePaid,
  currencyPaid,
  paymentProcessorKey,
  message,
  platformCut = null,
}: {
  userId: number;
  pricePaid: number;
  currencyPaid: string;
  paymentProcessorKey: string | null;
  message?: string | null;
  trackId: number;
  platformCut?: number | null;
}) => {
  const token = randomUUID();

  let purchase = await prisma.userTrackPurchase.findFirst({
    where: {
      userId: Number(userId),
      trackId: Number(trackId),
    },
  });

  if (purchase) {
    let transaction;
    if (!purchase.transactionId) {
      transaction = await prisma.userTransaction.create({
        data: {
          userId: Number(userId),
          amount: pricePaid,
          currency: currencyPaid,
          stripeId: paymentProcessorKey,
          platformCut: platformCut,
        },
      });
    }
    await prisma.userTrackPurchase.update({
      where: {
        userId_trackId: {
          userId: Number(userId),
          trackId: Number(trackId),
        },
      },
      data: {
        singleDownloadToken: token,
        transactionId: transaction?.id,
      },
    });
  }

  if (!purchase) {
    const transaction = await prisma.userTransaction.create({
      data: {
        userId: Number(userId),
        amount: pricePaid,
        currency: currencyPaid,
        stripeId: paymentProcessorKey,
        platformCut: platformCut,
      },
    });
    purchase = await prisma.userTrackPurchase.create({
      data: {
        userId: Number(userId),
        trackId: Number(trackId),
        pricePaid,
        message: message ?? null,
        currencyPaid,
        stripeSessionKey: paymentProcessorKey,
        singleDownloadToken: token,
        platformCut: platformCut ?? null,
        transactionId: transaction.id,
      },
    });
  }

  const refreshedPurchase = await prisma.userTrackPurchase.findFirst({
    where: {
      userId: Number(userId),
      trackId: Number(trackId),
    },
    include: {
      track: {
        include: {
          trackGroup: {
            include: {
              artist: true,
            },
          },
        },
      },
      transaction: true,
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
        notificationType: "USER_BOUGHT_YOUR_TRACK",
        userId: refreshedPurchase?.track.trackGroup.artist.userId,
        relatedUserId: Number(userId),
        trackId: Number(trackId),
        artistId: refreshedPurchase?.track.trackGroup.artistId,
      },
    });
  }
  return refreshedPurchase;
};

export const basicTrackGroupInclude = {
  include: {
    tracks: {
      deletedAt: null,
      include: {
        audio: { where: { uploadState: UploadState["SUCCESS"] } },
        trackArtists: true,
      },
    },
    cover: {
      include: {
        trackGroup: false,
      },
    },
    artist: {
      include: {
        user: false,
      },
    },
  },
};

export const findTrackPurchaseAndVoidToken = async (
  trackId: number,
  user: User
) => {
  let isCreator;
  try {
    isCreator = await doesTrackBelongToUser(Number(trackId), user);
  } catch (e) {}
  logger.info(`trackId: ${trackId} isCreator: ${isCreator}`);

  const purchase = await prisma.userTrackPurchase.findFirst({
    where: {
      trackId: Number(trackId),
      ...(!isCreator
        ? {
            userId: Number(user.id),
            track: {
              trackGroup: {
                published: true,
              },
            },
          }
        : {}),
    },
    include: {
      track: {
        include: {
          trackGroup: basicTrackGroupInclude,
        },
      },
    },
  });

  if (!purchase) {
    throw new AppError({
      httpCode: 404,
      description: `trackId: ${trackId} no purchase found`,
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

export const findPurchaseAndVoidToken = async (
  trackGroupId: number,
  user: User
) => {
  let isCreator;
  try {
    isCreator = await doesTrackGroupBelongToUser(Number(trackGroupId), user);
  } catch (e) {}
  logger.info(`trackGroupId: ${trackGroupId} isCreator: ${isCreator}`);

  const purchase = await prisma.userTrackGroupPurchase.findFirst({
    where: {
      trackGroupId: Number(trackGroupId),
      ...(!isCreator
        ? {
            userId: Number(user.id),
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

export const findTrackPurchaseBasedOnTokenAndUpdate = async (
  trackId: number,
  token: string,
  userId?: number
) => {
  const purchase = await prisma.userTrackPurchase.findFirst({
    where: {
      userId: userId,
      singleDownloadToken: token,
      trackId: Number(trackId),
    },
    include: {
      track: {
        include: {
          trackGroup: basicTrackGroupInclude,
        },
      },
    },
  });

  if (!purchase) {
    throw new AppError({
      httpCode: 404,
      description: `Track Purchase doesn't exist for trackId: ${trackId}, userId: ${userId}`,
    });
  }

  // TODO: do we want a token to be reset after download?
  // If so we probably want to do this once the download is
  // complete on the client otherwise there might be errors
  // await setDownloadTokenToNull({
  //   userId: user?.id,
  //   trackGroupId: Number(trackGroupId),
  // });

  return purchase.track;
};

export const trackGroupPublishedObject = {
  OR: [{ published: true }, { publishedAt: { lte: new Date() } }],
  deletedAt: null,
  isDrafts: false,
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
        ...trackGroupPublishedObject,
      },
    },
    include: {
      trackGroup: basicTrackGroupInclude,
    },
  });

  if (!purchase) {
    throw new AppError({
      httpCode: 404,
      description: `Trackgroup Purchase doesn't exist for trackgroupId: ${trackGroupId}, userId: ${userId}`,
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
    artist?: Partial<Artist> & { avatar?: ArtistAvatar | null };
    merch?: (Merch & { images: MerchImage[] })[];
    tracks?: Track[];
    tags?: (TrackGroupTag & { tag?: { tag?: string } })[];
    downloadableContent?: {
      downloadableContent: Record<string, unknown>;
      downloadableContentId: string;
    }[];
  }
) => ({
  ...tg,
  artist: tg.artist
    ? {
        ...tg.artist,
        avatar: tg.artist.avatar
          ? addSizesToImage(finalArtistAvatarBucket, tg.artist.avatar)
          : undefined,
      }
    : undefined,
  merch: tg.merch?.map(processSingleMerch),
  tags: tg.tags?.map((t) => t.tag?.tag) ?? [],
  cover: addSizesToImage(finalCoversBucket, tg.cover),
  downloadableContent: tg.downloadableContent?.map((dc) => ({
    ...dc,
    downloadableContent: {
      ...dc.downloadableContent,
      downloadUrl:
        process.env.API_DOMAIN +
        `/v1/downloadableContent/${dc.downloadableContentId}`,
    },
  })),
});

export const processTrackGroupQueryOrder = (orderByString?: unknown) => {
  let orderByObj: Partial<{
    releaseDate: "desc";
    id: "desc";
    createdAt: "desc";
  }> = {
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

export const createOrUpdatePledge = async ({
  userId,
  trackGroupId,
  message,
  amount,
  stripeSetupIntentId,
}: {
  userId: number;
  trackGroupId: number;
  message?: string;
  amount: number;
  stripeSetupIntentId: string;
}) => {
  logger.info(
    `Creating or updating pledge for userId: ${userId}, trackGroupId: ${trackGroupId}`
  );
  try {
    await prisma.trackGroupPledge.upsert({
      where: {
        userId_trackGroupId: {
          userId,
          trackGroupId: Number(trackGroupId),
        },
      },
      create: {
        user: {
          connect: {
            id: userId,
          },
        },
        trackGroup: {
          connect: {
            id: Number(trackGroupId),
          },
        },
        message,
        amount: Number(amount),
        stripeSetupIntentId: stripeSetupIntentId,
      },
      update: {
        message: message,
        amount: Number(amount),
        stripeSetupIntentId: stripeSetupIntentId,
      },
    });

    await sendBasecampAMessage(
      `New pledge amount: trackGroupId: <i>${trackGroupId}</i> pledged ${amount / 100} <b>${userId}</b>`
    );
  } catch (e) {
    throw new AppError({
      httpCode: 500,
      description: "Failed to create or update pledge.",
    });
  }
};

const chargePledges = (trackGroupId: number) => {
  // Logic to charge pledges for the given trackGroupId
};
