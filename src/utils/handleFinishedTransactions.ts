import prisma, { SafeUser } from "@mirlo/prisma";
import {
  Profile,
  TrackGroup,
  FundraiserPledge,
  Fundraiser,
} from "@mirlo/prisma/client";
import { Job } from "bullmq";

import sendMail from "../jobs/send-mail";
import { logger } from "../logger";
import { sendMailQueue } from "../queues/send-mail-queue";
import { processSingleArtist } from "../serializers/artist";
import { serializeFundraiserPledge } from "../serializers/fundraiser";
import { processSingleTrackGroup } from "../serializers/trackGroup";
import { serializeUserTransaction } from "../serializers/userTransaction";

import { subscribeUserToArtist } from "./artist";
import { sendBasecampAMessage } from "./basecamp";
import { findCataloguePurchasableTrackGroups } from "./catalogue";
import { getClient } from "./getClient";
import {
  CompletedPayment,
  withPlatformCurrency,
} from "./payments/completedPayment";
import { resolvePayee } from "./payments/payee";
import { calculateAppFee } from "./processingPayments";
import { hasSubscriptionTiers, registerSubscription } from "./subscriptionTier";
import { registerPurchase, registerTrackPurchase } from "./trackGroup";

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

export const handleTrackGroupPurchase = async (
  userId: number,
  trackGroupId: number,
  payment?: CompletedPayment,
  newUser?: boolean
) => {
  try {
    const { applicationUrl } = await getClient();
    const pricePaid = payment?.amount ?? 0;
    const currencyPaid = payment?.currency ?? "usd";
    const paymentProcessorKey = payment?.id ?? null;

    const transaction = await prisma.userTransaction.create({
      data: {
        userId: Number(userId),
        amount: pricePaid,
        currency: currencyPaid,
        platformCut: payment?.platformCut ?? 0,
        stripeId: paymentProcessorKey ?? "",
        stripeCut: payment?.processorFee ?? 0,
        ...withPlatformCurrency(payment?.platformCurrencyValue),
        paymentStatus: "COMPLETED",
        discountPercent: payment?.metadata.discountPercent
          ? Number(payment.metadata.discountPercent)
          : undefined,
      },
    });

    const purchase = await registerPurchase({
      userId: Number(userId),
      trackGroupId: Number(trackGroupId),
      pricePaid,
      message: payment?.metadata.message ?? null,
      currencyPaid,
      paymentProcessorKey,
      platformCut: payment?.platformCut ?? 0,
      transactionId: transaction.id,
    });

    const user = await prisma.user.findFirst({
      where: {
        id: userId,
      },
    });

    const trackGroup = await prisma.trackGroup.findFirst({
      where: {
        id: trackGroupId,
      },
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
    });

    if (user && trackGroup && purchase) {
      const serializedTrackGroup = processSingleTrackGroup(
        trackGroup
      ) as unknown as AlbumPurchaseEmailType["trackGroup"];
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
            trackGroup: serializedTrackGroup,
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

      const transactions = await prisma.userTransaction.findMany({
        where: {
          id: transaction.id,
        },
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
          trackGroupPurchases: {
            include: {
              trackGroup: {
                include: {
                  profile: true,
                },
              },
            },
          },
        },
      });

      const payee = resolvePayee({
        artist: trackGroup.profile,
        releasePaymentToUser: trackGroup.paymentToUser,
      });

      await sendMail<ArtistPurchaseNotificationEmailType>({
        data: {
          template: "artist-purchase-notification",
          message: {
            to: payee.email,
            cc: payee.accountingEmail,
          },
          locals: {
            transactions: transactions.map(
              (t) =>
                serializeUserTransaction(t, {
                  emailShape: true,
                }) as unknown as PurchaseTransaction
            ),
            totalGross: transactions.reduce((acc, t) => acc + t.amount, 0),
            totalNet: transactions.reduce(
              (acc, t) =>
                acc + (t.amount - (t.platformCut ?? 0) - (t.stripeCut ?? 0)),
              0
            ),
            currency: transactions[0]?.currency ?? "usd",
            message: payment?.metadata.message,
            email: user.email,
            client: applicationUrl,
          } as ArtistPurchaseNotificationEmailType,
        },
      } as Job);

      await sendBasecampAMessage(
        `New album purchase: <i>${trackGroup.title}</i> by ${trackGroup.profile.name}, purchased by <b>${user.email}</b>`
      );
    }

    return purchase;
  } catch (e) {
    logger.error(
      `Error creating album purchase for trackGroupId ${trackGroupId}, userId ${userId}, payment ${payment?.id}:`,
      e
    );
  }
};

export const handleCataloguePurchase = async (
  userId: number,
  artistId: number,
  payment?: CompletedPayment
) => {
  try {
    const { applicationUrl } = await getClient();
    const artist = await prisma.profile.findFirst({
      where: {
        id: artistId,
      },
      include: {
        user: true,
      },
    });
    const artistTrackGroups = artist
      ? await findCataloguePurchasableTrackGroups(artist)
      : [];

    const pricePaid = payment?.amount ?? 0;
    const currencyPaid = payment?.currency ?? "usd";
    const paymentProcessorKey = payment?.id ?? null;
    const applicationFee = payment?.platformCut ?? 0;

    const amountPaidPerTrackGroup = pricePaid / artistTrackGroups.length;
    const appFeePerTrackGroup = applicationFee / artistTrackGroups.length;

    // We only create one transaction for the whole purchase
    // so that we can use the same transaction for all track groups
    const transaction = await prisma.userTransaction.create({
      data: {
        userId: Number(userId),
        amount: pricePaid,
        currency: currencyPaid,
        platformCut: applicationFee,
        stripeId: paymentProcessorKey ?? "",
        stripeCut: payment?.processorFee ?? 0,
        ...withPlatformCurrency(payment?.platformCurrencyValue),
        paymentStatus: "COMPLETED",
      },
    });

    const purchases = await Promise.all(
      artistTrackGroups.map(async (trackGroup) => {
        return registerPurchase({
          userId: Number(userId),
          trackGroupId: Number(trackGroup.id),
          message: payment?.metadata.message ?? null,
          pricePaid: Number(amountPaidPerTrackGroup.toFixed(2)),
          currencyPaid,
          paymentProcessorKey,
          platformCut: Number(appFeePerTrackGroup.toFixed(2)),
          transactionId: transaction.id,
        });
      })
    );

    const downloadTokensByTrackGroupId = new Map(
      purchases
        .filter(
          (purchase): purchase is NonNullable<typeof purchase> =>
            purchase !== null
        )
        .map((purchase) => [
          purchase.trackGroupId,
          purchase.singleDownloadToken,
        ])
    );

    const user = await prisma.user.findFirst({
      where: {
        id: userId,
      },
    });

    if (user && artist && artistTrackGroups.length > 0) {
      const serializedArtist = processSingleArtist(artist);
      await sendMail({
        data: {
          template: "catalogue-receipt",
          message: {
            to: user.email,
          },
          locals: {
            artist: serializedArtist,
            trackGroups: artistTrackGroups.map((tg) => ({
              ...processSingleTrackGroup(tg),
              token: downloadTokensByTrackGroupId.get(tg.id),
            })),
            email: user.email,
            client: applicationUrl,
            host: process.env.API_DOMAIN,
            hasSubscriptionTiers: await hasSubscriptionTiers(artist.id),
          },
        },
      } as Job);

      const catalogueAppFee = await calculateAppFee(pricePaid, currencyPaid);
      await sendMail({
        data: {
          template: "catalogue-purchase-artist-notification",
          message: {
            to: artist.user.email,
          },
          locals: {
            artist: serializedArtist,
            pricePaid,
            currencyPaid,
            platformCut: (catalogueAppFee ?? 0) / 100,
            email: user.email,
          },
        },
      } as Job);
    }
  } catch (e) {
    logger.error(
      `Error creating catalogue purchase for profileId ${artistId}, userId ${userId}, payment ${payment?.id}:`,
      e
    );
  }
};

export const handleTrackPurchase = async (
  userId: number,
  trackId: number,
  payment?: CompletedPayment
) => {
  try {
    const purchase = await registerTrackPurchase({
      userId: Number(userId),
      trackId: Number(trackId),
      pricePaid: payment?.amount ?? 0,
      message: payment?.metadata.message ?? null,
      currencyPaid: payment?.currency ?? "usd",
      paymentProcessorKey: payment?.id ?? null,
      platformCut: payment?.platformCut ?? 0,
      discountPercent: payment?.metadata.discountPercent
        ? Number(payment.metadata.discountPercent)
        : undefined,
      platformCurrencyValue: payment?.platformCurrencyValue,
    });

    const user = await prisma.user.findFirst({
      where: {
        id: userId,
      },
    });

    const track = await prisma.track.findFirst({
      where: {
        id: trackId,
      },
      include: {
        trackGroup: {
          include: {
            profile: {
              include: {
                subscriptionTiers: true,
                user: true,
              },
            },
            paymentToUser: true,
          },
        },
      },
    });

    if (user && track && purchase && purchase.transactionId) {
      await sendSaleEmails(track.trackGroup.profile, user, [
        purchase.transactionId,
      ]);
    }

    return purchase;
  } catch (e) {
    logger.error(
      `Error creating track purchase for trackId ${trackId}, userId ${userId}, payment ${payment?.id}:`,
      e
    );
  }
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
        artist: processSingleArtist(
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

export const sendSaleEmails = async (
  artist: Profile & {
    user: SafeUser;
    properties?: { emails?: { purchase?: string } } | null;
  },
  purchaser: SafeUser,
  transactionIds: string[],
  message?: string
) => {
  try {
    const { applicationUrl } = await getClient();
    const transactions = await transactionsForEmails(transactionIds);

    const serializedTransactions = transactions.map(
      (t) =>
        serializeUserTransaction(t, {
          emailShape: true,
        }) as unknown as PurchaseTransaction
    );

    await sendPurchaseReceipt(artist, purchaser, transactions);

    await sendMail<ArtistPurchaseNotificationEmailType>({
      data: {
        template: "artist-purchase-notification",
        message: {
          to: artist.user.email,
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
  } catch (e) {
    logger.error(`Error creating sale emails: ${e}`);
  }
};

export const handleArtistGift = async (
  userId: number,
  artistId: number,
  payment?: CompletedPayment
) => {
  try {
    const transaction = await prisma.userTransaction.create({
      data: {
        userId: Number(userId),
        amount: payment?.amount ?? 0,
        currency: payment?.currency ?? "usd",
        platformCut: payment?.platformCut ?? 0,
        stripeCut: payment?.processorFee ?? 0,
        stripeId: payment?.id ?? "",
        ...withPlatformCurrency(payment?.platformCurrencyValue),
        paymentStatus: "COMPLETED",
      },
    });

    const createdTip = await prisma.userProfileTip.create({
      data: {
        userId,
        profileId: artistId,
        message: payment?.metadata.message ?? null,
        transactionId: transaction.id,
      },
    });

    const tip = await prisma.userProfileTip.findFirst({
      where: {
        id: createdTip.id,
      },
      include: {
        profile: { include: { user: true, subscriptionTiers: true } },
      },
    });

    const user = await prisma.user.findFirst({
      where: {
        id: userId,
      },
    });

    if (tip) {
      subscribeUserToArtist(tip.profile, user);
    }

    if (user && tip) {
      await sendSaleEmails(tip.profile, user, [transaction.id]);
    }

    return tip;
  } catch (e) {
    logger.error(`Error creating tip: ${e}`);
    throw e;
  }
};

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
