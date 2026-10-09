import prisma, { SafeUser } from "@mirlo/prisma";
import {
  Profile,
  TrackGroup,
  FundraiserPledge,
  Fundraiser,
} from "@mirlo/prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/client";
import { Job } from "bullmq";

import sendMail from "../jobs/send-mail";
import { logger } from "../logger";
import { sendMailQueue } from "../queues/send-mail-queue";
import { serializeProfile } from "../serializers/artist";
import { serializeFundraiserPledge } from "../serializers/fundraiser";
import { processSingleTrackGroup } from "../serializers/trackGroup";
import { serializeUserTransaction } from "../serializers/userTransaction";

import { subscribeUserToProfile } from "./artist";
import { sendBasecampAMessage } from "./basecamp";
import { findCataloguePurchasableTrackGroups } from "./catalogue";
import { getClient } from "./getClient";
import { decrementMerchStock } from "./merch";
import {
  CompletedPayment,
  withPlatformCurrency,
} from "./payments/completedPayment";
import { resolvePayee } from "./payments/payee";
import type { ResolvedItem } from "./payments/purchase";
import { calculateAppFee } from "./processingPayments";
import { hasSubscriptionTiers, registerSubscription } from "./subscriptionTier";
import { registerPurchase, registerTrackPurchase } from "./trackGroup";

export const recordCompletedTransaction = (
  userId: number,
  payment?: CompletedPayment
) =>
  prisma.userTransaction.create({
    data: {
      userId: Number(userId),
      amount: payment?.amount ?? 0,
      currency: payment?.currency ?? "usd",
      platformCut: payment?.platformCut ?? 0,
      stripeCut: payment?.processorFee ?? 0,
      stripeId: payment?.id ?? null,
      ...withPlatformCurrency(payment?.platformCurrencyValue),
      paymentStatus: "COMPLETED",
      discountPercent: payment?.metadata.discountPercent
        ? Number(payment.metadata.discountPercent)
        : undefined,
    },
  });

export type AlbumPurchaseEmailType = {
  trackGroup: {
    title: string;
    id: number;
    artist: {
      name: string;
      id: number;
      properties?: { emails?: { purchase?: string } };
    };
  };
  purchase: {
    id: number;
    singleDownloadToken: string;
    transaction?: {
      amount: number;
      currency: string;
    };
  };
  isBeforeReleaseDate: boolean;
  token: string;
  email: string;
  client: string;
  host: string;
  hasSubscriptionTiers?: boolean;
};

export const purchaseForAlbumPurchaseEmail = (purchase: {
  trackGroupId: number;
  singleDownloadToken: string | null;
  transaction?: { amount: number; currency: string } | null;
}): AlbumPurchaseEmailType["purchase"] => ({
  id: purchase.trackGroupId,
  singleDownloadToken: purchase.singleDownloadToken ?? "",
  transaction: purchase.transaction
    ? {
        amount: purchase.transaction.amount,
        currency: purchase.transaction.currency,
      }
    : undefined,
});

export type TrackPurchaseEmailType = {
  track: {
    title: string;
    id: number;
    trackGroup: TrackGroup;
  };
  purchase: {
    singleDownloadToken: string;
    transaction?: {
      amount: number;
      currency: string;
    };
  };
  token: string;
  email: string;
  client: string;
  host: string;
};

export type TrackPurchaseArtistNotificationEmailType = {
  track: {
    title: string;
    id: number;
    trackGroup: TrackGroup;
  };
  purchase: {
    singleDownloadToken: string;
    transaction?: {
      amount: number;
      currency: string;
    };
  };
  pricePaid: number;
  platformCut: number;
  email: string;
};

export type AlbumPurchaseArtistNotificationEmailType = {
  trackGroup: {
    title: string;
    id: number;
    artist: { name: string; id: number; user: { name: string } };
  };
  purchase: {
    singleDownloadToken: string;
    transaction?: {
      amount: number;
      id: string;
      currency: string;
      stripeCut: number;
      platformCut: number;
    };
  };
  email: string;
};

type PurchaseTransaction = {
  userId: number;
  user: {
    name: string;
    email: string;
  };
  trackGroupPurchases?: {
    trackGroup: {
      title: string;
      id: number;
      urlSlug: string;
      artist: { name: string; urlSlug: string };
    };
  }[];
  trackPurchases?: {
    track: {
      trackGroup: {
        title: string;
        id: number;
        artist?: { name: string; urlSlug: string };
      };
      title: string;
      id: number;
    };
  }[];
  merchPurchases?: {
    merchId: string;
    options: { name: string }[];
    merch: { title: string; id: string; artist?: { name: string } };
    quantity: number;
  }[];
  tips?: {
    artist: { name: string; id: number };
  }[];
  amount: number;
  currency: string;
  id: string;
  stripeCut: number;
  platformCut: number;
  userFriendlyId?: string | null;
};

export type PurchaseReceiptEmailType = {
  transactions: PurchaseTransaction[];
  email: string;
  client: string;
  host: string;
  artist: {
    user: SafeUser;
    properties?: { emails?: { purchase?: string } } | null;
  };
};

export type ArtistPurchaseNotificationEmailType = {
  transactions: PurchaseTransaction[];
  message: string | null;
  email: string;
  totalGross: number;
  totalNet: number;
  currency: string;
  client: string;
};

/** The full shape of a transaction that the receipt templates expect. */
export const transactionsForEmails = async (transactionIds: string[]) => {
  return prisma.userTransaction.findMany({
    where: {
      id: {
        in: transactionIds,
      },
    },
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
      tips: {
        include: {
          profile: {
            include: {
              user: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      },
      trackGroupPurchases: {
        include: {
          trackGroup: {
            select: {
              id: true,
              title: true,
              urlSlug: true,
              profile: {
                include: {
                  user: {
                    select: {
                      name: true,
                      email: true,
                      urlSlug: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
      merchPurchases: {
        include: {
          options: {
            select: {
              name: true,
            },
          },
          merch: {
            include: {
              profile: {
                include: {
                  user: true,
                },
              },
            },
          },
        },
      },
      trackPurchases: {
        include: {
          track: {
            include: {
              trackGroup: {
                include: {
                  profile: {
                    include: {
                      user: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
};

export type TransactionForEmails = Awaited<
  ReturnType<typeof transactionsForEmails>
>[number];

/**
 * The buyer's half of the sale emails. Kept separate from the artist
 * notification so a receipt can be re-sent on its own, without the artist
 * getting a second "you made a sale" email (#2286).
 */
export const sendPurchaseReceipt = async (
  artist: Profile & {
    user: SafeUser;
    properties?: { emails?: { purchase?: string } } | null;
  },
  purchaser: SafeUser,
  transactions: TransactionForEmails[]
) => {
  const { applicationUrl } = await getClient();

  await sendMail<PurchaseReceiptEmailType>({
    data: {
      template: "purchase-receipt",
      message: {
        to: purchaser.email,
      },
      locals: {
        artist: serializeProfile(
          artist
        ) as unknown as PurchaseReceiptEmailType["artist"],
        transactions: transactions.map(
          (t) =>
            serializeUserTransaction(t, {
              emailShape: true,
            }) as unknown as PurchaseTransaction
        ),
        email: purchaser.email,
        client: applicationUrl,
        host: process.env.API_DOMAIN,
      } as PurchaseReceiptEmailType,
    },
  } as Job);
};

/**
 * The "you made a sale" email. Goes to the payee (see resolvePayee), cc'ing
 * their accounting address, so a label set as `paymentToUser` hears about
 * every sale it gets paid for.
 */
export const sendArtistSaleNotification = async ({
  payee,
  purchaser,
  transactions,
  message,
}: {
  payee: Pick<SafeUser, "email" | "accountingEmail">;
  purchaser: SafeUser;
  transactions: TransactionForEmails[];
  message?: string;
}) => {
  const { applicationUrl } = await getClient();
  const serializedTransactions = transactions.map(
    (t) =>
      serializeUserTransaction(t, {
        emailShape: true,
      }) as unknown as PurchaseTransaction
  );

  await sendMail<ArtistPurchaseNotificationEmailType>({
    data: {
      template: "artist-purchase-notification",
      message: {
        to: payee.email,
        cc: payee.accountingEmail,
      },
      locals: {
        transactions: serializedTransactions,
        totalGross: serializedTransactions.reduce(
          (acc, t) => acc + t.amount,
          0
        ),
        totalNet: serializedTransactions.reduce(
          (acc, t) =>
            acc + (t.amount - (t.platformCut ?? 0) - (t.stripeCut ?? 0)),
          0
        ),
        currency: serializedTransactions[0]?.currency ?? "usd",
        message: message ?? null,
        email: purchaser.email,
        client: applicationUrl,
        host: process.env.API_DOMAIN,
      } as ArtistPurchaseNotificationEmailType,
    },
  } as Job);
};

type SaleArtist = Profile & {
  user: SafeUser;
  paymentToUser: SafeUser | null;
  properties?: { emails?: { purchase?: string } } | null;
};

type SaleContext = {
  artist: SaleArtist;
  releasePaymentToUser?: SafeUser | null;
};

type AttachContext = {
  userId: number;
  user: SafeUser | null;
  transaction: Awaited<ReturnType<typeof recordCompletedTransaction>>;
  payment?: CompletedPayment;
  message?: string;
  newUser: boolean;
};

type AttachResult = {
  sale?: SaleContext;
  genericReceipt?: boolean;
  genericNotification?: boolean;
};

const attachTrackGroup = async (
  item: ResolvedItem,
  { userId, user, transaction, message, newUser }: AttachContext
): Promise<AttachResult> => {
  const trackGroupId = Number(item.id);
  const purchase = await registerPurchase({
    userId,
    trackGroupId,
    pricePaid: item.amount,
    message: message ?? null,
    currencyPaid: transaction.currency,
    paymentProcessorKey: transaction.stripeId,
    platformCut: transaction.platformCut,
    transactionId: transaction.id,
  });

  const trackGroup = await prisma.trackGroup.findFirst({
    where: { id: trackGroupId },
    include: {
      profile: {
        include: { subscriptionTiers: true, user: true, paymentToUser: true },
      },
      paymentToUser: true,
    },
  });
  if (!trackGroup) return {};

  if (user && purchase) {
    const { applicationUrl } = await getClient();
    const isBeforeReleaseDate = trackGroup.releaseDate
      ? new Date(trackGroup.releaseDate) > new Date()
      : false;

    await sendMail<AlbumPurchaseEmailType>({
      data: {
        template: newUser ? "album-download" : "album-purchase-receipt",
        message: {
          to: user.email,
        },
        locals: {
          trackGroup: processSingleTrackGroup(
            trackGroup
          ) as unknown as AlbumPurchaseEmailType["trackGroup"],
          purchase: purchaseForAlbumPurchaseEmail(purchase),
          isBeforeReleaseDate,
          token: purchase.singleDownloadToken,
          email: user.email,
          client: applicationUrl,
          host: process.env.API_DOMAIN,
          hasSubscriptionTiers: await hasSubscriptionTiers(
            trackGroup.profileId
          ),
        },
      },
    } as Job);

    await sendBasecampAMessage(
      `New album purchase: <i>${trackGroup.title}</i> by ${trackGroup.profile.name}, purchased by <b>${user.email}</b>`
    );
  }

  return {
    sale: {
      artist: trackGroup.profile,
      releasePaymentToUser: trackGroup.paymentToUser,
    },
    genericNotification: true,
  };
};

const attachTrack = async (
  item: ResolvedItem,
  { userId, transaction, message }: AttachContext
): Promise<AttachResult> => {
  const trackId = Number(item.id);
  await registerTrackPurchase({
    userId,
    trackId,
    message: message ?? null,
    transactionId: transaction.id,
  });

  const track = await prisma.track.findFirst({
    where: { id: trackId },
    include: {
      trackGroup: {
        include: {
          profile: {
            include: {
              subscriptionTiers: true,
              user: true,
              paymentToUser: true,
            },
          },
          paymentToUser: true,
        },
      },
    },
  });
  if (!track) return {};

  return {
    sale: {
      artist: track.trackGroup.profile,
      releasePaymentToUser: track.trackGroup.paymentToUser,
    },
    genericReceipt: true,
    genericNotification: true,
  };
};

const attachTip = async (
  profileId: number,
  { userId, user, transaction, message }: AttachContext
): Promise<AttachResult> => {
  const tip = await prisma.userProfileTip.create({
    data: {
      userId,
      profileId,
      message: message ?? null,
      transactionId: transaction.id,
    },
    include: {
      profile: {
        include: { user: true, paymentToUser: true, subscriptionTiers: true },
      },
    },
  });

  await subscribeUserToProfile(tip.profile, user);

  return {
    sale: { artist: tip.profile },
    genericReceipt: true,
    genericNotification: true,
  };
};

const attachMerch = async (
  item: ResolvedItem,
  { userId, transaction, payment }: AttachContext
): Promise<AttachResult> => {
  const merch = await prisma.merch.findFirst({
    where: { id: item.id },
    include: {
      profile: { include: { user: true, paymentToUser: true } },
    },
  });

  if (!merch) {
    logger.warn(`completePurchase: merch ${item.id} not found`);
    return {};
  }

  const quantity = item.quantity ?? 1;

  await prisma.merchPurchase.create({
    data: {
      userId,
      merchId: merch.id,
      transactionId: transaction.id,
      fulfillmentStatus: "NO_PROGRESS",
      quantity,
      ...(item.optionIds?.length && {
        options: { connect: item.optionIds.map((id) => ({ id })) },
      }),
      ...(payment?.shippingAddress && {
        shippingAddress: payment.shippingAddress,
      }),
    },
  });

  if (merch.includePurchaseTrackGroupId) {
    try {
      await prisma.userTrackGroupPurchase.create({
        data: {
          trackGroupId: merch.includePurchaseTrackGroupId,
          userId,
          proGratis: true,
        },
      });
    } catch (e: any) {
      if (
        e instanceof PrismaClientKnownRequestError ||
        e?.name === "PrismaClientKnownRequestError"
      ) {
        if (e.code !== "P2002") {
          throw e;
        }
      } else {
        throw e;
      }
    }
  }

  await decrementMerchStock(merch.id, item.optionIds ?? [], quantity);

  logger.info(
    `completePurchase: created purchase for merch ${merch.id}, userId ${userId}`
  );

  return {
    sale: { artist: merch.profile },
    genericReceipt: true,
    genericNotification: true,
  };
};

const attachCatalogue = async (
  profileId: number,
  item: ResolvedItem,
  { userId, user, transaction, message }: AttachContext
): Promise<AttachResult> => {
  const profile = await prisma.profile.findFirst({
    where: { id: profileId },
    include: { user: true, paymentToUser: true },
  });
  if (!profile) return {};

  const profileTrackGroups = await findCataloguePurchasableTrackGroups(profile);
  const amountPaidPerTrackGroup = item.amount / profileTrackGroups.length;
  const appFeePerTrackGroup =
    (transaction.platformCut ?? 0) / profileTrackGroups.length;

  const purchases = await Promise.all(
    profileTrackGroups.map((trackGroup) =>
      registerPurchase({
        userId,
        trackGroupId: Number(trackGroup.id),
        message: message ?? null,
        pricePaid: Number(amountPaidPerTrackGroup.toFixed(2)),
        currencyPaid: transaction.currency,
        paymentProcessorKey: transaction.stripeId,
        platformCut: Number(appFeePerTrackGroup.toFixed(2)),
        transactionId: transaction.id,
      })
    )
  );

  const downloadTokensByTrackGroupId = new Map(
    purchases
      .filter(
        (purchase): purchase is NonNullable<typeof purchase> =>
          purchase !== null
      )
      .map((purchase) => [purchase.trackGroupId, purchase.singleDownloadToken])
  );

  if (user && profileTrackGroups.length > 0) {
    const { applicationUrl } = await getClient();
    const serializedProfile = serializeProfile(profile);
    await sendMail({
      data: {
        template: "catalogue-receipt",
        message: {
          to: user.email,
        },
        locals: {
          artist: serializedProfile,
          trackGroups: profileTrackGroups.map((tg) => ({
            ...processSingleTrackGroup(tg),
            token: downloadTokensByTrackGroupId.get(tg.id),
          })),
          email: user.email,
          client: applicationUrl,
          host: process.env.API_DOMAIN,
          hasSubscriptionTiers: await hasSubscriptionTiers(profile.id),
        },
      },
    } as Job);

    const catalogueAppFee = await calculateAppFee(
      item.amount,
      transaction.currency
    );
    const payee = resolvePayee({ profile });
    await sendMail({
      data: {
        template: "catalogue-purchase-artist-notification",
        message: {
          to: payee.email,
          cc: payee.accountingEmail,
        },
        locals: {
          artist: serializedProfile,
          pricePaid: item.amount,
          currencyPaid: transaction.currency,
          platformCut: (catalogueAppFee ?? 0) / 100,
          email: user.email,
        },
      },
    } as Job);
  }

  return { sale: { artist: profile } };
};

export const completePurchase = async (
  userId: number,
  items: ResolvedItem[],
  payment?: CompletedPayment,
  { newUser = false, profileId }: { newUser?: boolean; profileId?: number } = {}
) => {
  if (items.length === 0) {
    logger.error(
      `completePurchase: payment ${payment?.id} for userId ${userId} carried no items, nothing recorded`
    );
    return;
  }

  const transaction = await recordCompletedTransaction(userId, payment);
  const user = await prisma.user.findFirst({ where: { id: userId } });
  const resolvedProfileId = profileId ?? Number(payment?.metadata.artistId);

  let sale: SaleContext | undefined;
  let genericReceipt = false;
  let genericNotification = false;

  for (const item of items) {
    const context: AttachContext = {
      userId,
      user,
      transaction,
      payment,
      message: item.message ?? payment?.metadata.message,
      newUser,
    };
    try {
      let result: AttachResult = {};
      if (item.type === "trackGroup") {
        result = await attachTrackGroup(item, context);
      } else if (item.type === "track") {
        result = await attachTrack(item, context);
      } else if (item.type === "tip") {
        result = await attachTip(resolvedProfileId, context);
      } else if (item.type === "merch") {
        result = await attachMerch(item, context);
      } else if (item.type === "catalogue") {
        result = await attachCatalogue(resolvedProfileId, item, context);
      }
      sale ??= result.sale;
      genericReceipt ||= !!result.genericReceipt;
      genericNotification ||= !!result.genericNotification;
    } catch (e) {
      logger.error(
        `completePurchase: failed to record ${item.type} ${item.id ?? ""} for userId ${userId}, payment ${payment?.id}:`,
        e
      );
    }
  }

  if (user && sale && (genericReceipt || genericNotification)) {
    try {
      const transactions = await transactionsForEmails([transaction.id]);
      if (genericReceipt) {
        await sendPurchaseReceipt(sale.artist, user, transactions);
      }
      if (genericNotification) {
        await sendArtistSaleNotification({
          payee: resolvePayee(sale),
          purchaser: user,
          transactions,
          message:
            items.find((i) => i.message)?.message ?? payment?.metadata.message,
        });
      }
    } catch (e) {
      logger.error(`Error creating sale emails: ${e}`);
    }
  }

  return transaction;
};

const singleItem = (
  type: ResolvedItem["type"],
  id: number | undefined,
  payment?: CompletedPayment
): ResolvedItem[] => [
  {
    type,
    ...(id !== undefined && { id: String(id) }),
    quantity: 1,
    amount: payment?.amount ?? 0,
  },
];

export const handleTrackGroupPurchase = (
  userId: number,
  trackGroupId: number,
  payment?: CompletedPayment,
  newUser?: boolean
) =>
  completePurchase(
    userId,
    singleItem("trackGroup", trackGroupId, payment),
    payment,
    {
      newUser,
    }
  );

export const handleTrackPurchase = (
  userId: number,
  trackId: number,
  payment?: CompletedPayment
) => completePurchase(userId, singleItem("track", trackId, payment), payment);

export const handleProfileGift = (
  userId: number,
  profileId: number,
  payment?: CompletedPayment
) =>
  completePurchase(userId, singleItem("tip", undefined, payment), payment, {
    profileId,
  });

export const handleCataloguePurchase = (
  userId: number,
  profileId: number,
  payment?: CompletedPayment
) =>
  completePurchase(
    userId,
    singleItem("catalogue", undefined, payment),
    payment,
    { profileId }
  );

export type ArtistSubscriptionReceiptEmailType = {
  interval: "monthly" | "yearly";
  artist: Profile;
  artistUserSubscription: {
    id: number;
    amount: number;
    currency: string;
    artistSubscriptionTierId: number;
    artistSubscriptionTier: {
      name: string;
    };
  };
  user: {
    name: string;
    email: string;
  };
  email: string;
  client: string;
  host: string;
};

export type ArtistNewSubscriberAnnounceEmailType = {
  interval: "monthly" | "yearly";
  artist: Profile;
  artistUserSubscription: {
    artistSubscriptionTierId: number;
    id: number;
    amount: number;
    artistSubscriptionTier: {
      name: string;
    };
  };
  user: {
    name: string;
    email: string;
  };
  email: string;
  client: string;
  host: string;
};

export const handleSubscription = async (
  userId: number,
  tierId: number,
  payment: CompletedPayment,
  subscriptionKey: string
) => {
  try {
    await registerSubscription({
      userId: Number(userId),
      tierId: Number(tierId),
      amount: payment.amount,
      paymentProcessorKey: subscriptionKey,
      platformCut: payment.platformCut,
      shippingAddress: payment.shippingAddress,
    });
  } catch (e) {
    logger.error(`Error creating subscription: ${e}`);
  }
};

export const handleFundraiserPledge = async (
  pledge: FundraiserPledge & {
    fundraiser: Fundraiser & { trackGroups: TrackGroup[] };
  },
  stripeId: string,
  currency: string
) => {
  const transaction = await prisma.userTransaction.create({
    data: {
      userId: pledge.userId,
      amount: pledge.amount,
      currency,
      createdAt: new Date(),
      paymentStatus: "PENDING",
      stripeId,
    },
  });

  logger.info(
    `Updated pledge ${pledge.id} as paid and created transaction ${transaction.id}`
  );
};

export const handleFundraiserPledgePaymentSuccess = async (
  transactionId: string
) => {
  const { applicationUrl } = await getClient();
  const transaction = await prisma.userTransaction.findFirst({
    where: {
      id: transactionId,
    },
    include: {
      associatedPledge: {
        include: { fundraiser: { include: { trackGroups: true } } },
      },
    },
  });

  if (!transaction) {
    console.error(`Transaction ${transactionId} not found`);
    return;
  }

  if (transaction.associatedPledge === null) {
    console.error(`Transaction ${transactionId} has no associated pledge`);
    return;
  }

  await prisma.userTransaction.update({
    where: {
      id: transaction.id,
    },
    data: {
      paymentStatus: "COMPLETED",
    },
  });

  const pledge = await prisma.fundraiserPledge.update({
    where: {
      id: transaction.associatedPledge.id,
    },
    data: {
      paidAt: new Date(),
      associatedTransactionId: transaction.id,
    },
    select: {
      amount: true,
      user: {
        select: { email: true },
      },
      fundraiser: {
        select: {
          goalAmount: true,
          trackGroups: {
            select: {
              title: true,
              urlSlug: true,
              profile: {
                select: {
                  name: true,
                  urlSlug: true,
                },
              },
            },
          },
        },
      },
    },
  });

  await prisma.notification.create({
    data: {
      userId: transaction.associatedPledge.userId,
      notificationType: "FUNDRAISER_PLEDGE_CHARGED",
      content: `Your pledge of ${(transaction.amount / 100).toFixed(
        2
      )} ${transaction.currency.toUpperCase()} to the fundraiser "${
        transaction.associatedPledge.fundraiser.name
      }" has been successfully processed.`,
      createdAt: new Date(),
      trackGroupId: transaction.associatedPledge.fundraiser.trackGroups[0].id,
    },
  });

  await Promise.all(
    transaction.associatedPledge.fundraiser.trackGroups.map(async (tg) => {
      if (transaction.associatedPledge === null) {
        return;
      }
      await prisma.userTrackGroupPurchase.create({
        data: {
          userId: transaction.associatedPledge.userId,
          trackGroupId: tg.id,
          createdAt: new Date(),
          userTransactionId: transaction.id,
        },
      });
    })
  );

  const serializedPledge = serializeFundraiserPledge(pledge);
  const serializedTrackGroup = serializedPledge.fundraiser
    ?.trackGroups?.[0] as {
    artist: { name: string };
    [key: string]: unknown;
  };

  await sendMailQueue.add("send-mail", {
    template: "fundraiser-success",
    message: {
      to: pledge.user.email,
    },
    locals: {
      artist: serializedTrackGroup.artist,
      email: encodeURIComponent(pledge.user.email),
      host: process.env.API_DOMAIN,
      trackGroup: serializedTrackGroup,
      currency: transaction.currency,
      pledgedAmountFormatted: pledge.amount / 100,
      fundraisingGoalFormatted: (pledge.fundraiser.goalAmount ?? 0) / 100,
      client: applicationUrl,
    },
  });
};

export const handleFundraiserPledgePaymentFailure = async (
  transactionId: string,
  urlParams: string
) => {
  const { applicationUrl } = await getClient();
  const transaction = await prisma.userTransaction.findFirst({
    where: {
      id: transactionId,
    },
    include: {
      associatedPledge: {
        include: {
          user: true,
          fundraiser: {
            include: { trackGroups: { include: { profile: true } } },
          },
        },
      },
    },
  });

  if (!transaction) {
    console.error(
      `handleFundraiserPledgePaymentFailure: Transaction ${transactionId} not found`
    );
    return;
  }

  if (!transaction.associatedPledge) {
    console.error(
      `handleFundraiserPledgePaymentFailure: Transaction ${transactionId} has no associated pledge`
    );
    return;
  }

  await prisma.userTransaction.update({
    where: {
      id: transaction.id,
    },
    data: {
      paymentStatus: "FAILED",
    },
  });

  const serializedPledge = serializeFundraiserPledge(
    transaction.associatedPledge
  );
  const serializedTrackGroup = serializedPledge.fundraiser
    ?.trackGroups?.[0] as {
    artist: { name: string };
    title: string;
  };

  await sendMailQueue.add("send-mail", {
    template: "charge-failure",
    message: {
      to: transaction.associatedPledge.user.email,
    },
    locals: {
      artist: serializedTrackGroup.artist,
      email: encodeURIComponent(transaction.associatedPledge?.user.email),
      host: process.env.API_DOMAIN,
      cardChargeContext: `your pledge to "${serializedTrackGroup.artist.name}'s ${serializedTrackGroup.title}" fundraiser`,
      currency: transaction.currency,
      pledgedAmountFormatted: transaction.associatedPledge.amount / 100,
      client: applicationUrl,
      urlParams,
    },
  });
};
