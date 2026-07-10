import prisma from "@mirlo/prisma";
import {
  Profile,
  MerchOption,
  TrackGroup,
  User,
  FundraiserPledge,
  Fundraiser,
} from "@mirlo/prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { Job } from "bullmq";
import Stripe from "stripe";

import sendMail from "../jobs/send-mail";
import { logger } from "../logger";
import { sendMailQueue } from "../queues/send-mail-queue";

import { subscribeUserToArtist } from "./artist";
import { sendBasecampAMessage } from "./basecamp";
import { getClient } from "./getClient";
import { resolvePayee } from "./payments/payee";
import { calculateAppFee } from "./processingPayments";
import { processSingleArtist } from "../serializers/artist";
import { serializeFundraiserPledge } from "../serializers/fundraiser";
import { processSingleTrackGroup } from "../serializers/trackGroup";
import { serializeUserTransaction } from "../serializers/userTransaction";
import stripe, { OPTION_JOINER } from "./stripe";
import { registerSubscription } from "./subscriptionTier";
import { registerPurchase, registerTrackPurchase } from "./trackGroup";

const getPaymentIntent = async (
  paymentIntentId: string,
  stripeAccount: string
) => {
  try {
    return await stripe.paymentIntents.retrieve(paymentIntentId, {
      stripeAccount,
    });
  } catch (error) {
    logger.error(`Error retrieving payment intent: ${error}`);
    throw new Error("Failed to retrieve payment intent");
  }
};

// Reads the platform application fee and the Stripe processing fee for a
// (settled) PaymentIntent from its latest charge's balance transaction. Callers
// keep their own error policy — this throws if Stripe can't be reached.
export const getFeesFromPaymentIntent = async (
  paymentIntent: Stripe.PaymentIntent,
  stripeAccount: string
): Promise<{ applicationFee: number; paymentProcessorFee: number }> => {
  const chargeId =
    typeof paymentIntent.latest_charge === "string"
      ? paymentIntent.latest_charge
      : (paymentIntent.latest_charge?.id ?? "");

  let paymentProcessorFee = 0;
  if (chargeId) {
    const charge = await stripe.charges.retrieve(
      chargeId,
      { expand: ["balance_transaction"] },
      { stripeAccount }
    );
    const balanceTransaction = charge.balance_transaction as
      | Stripe.BalanceTransaction
      | undefined;
    paymentProcessorFee =
      balanceTransaction?.fee_details.find((fee) => fee.type === "stripe_fee")
        ?.amount ?? 0;
  }

  return {
    applicationFee: paymentIntent.application_fee_amount ?? 0,
    paymentProcessorFee,
  };
};

// A transaction's value in the PLATFORM's settlement currency (see the schema
// comment on UserTransaction for why we freeze it at charge time). This is the
// processor-agnostic contract: fields map 1:1 to the UserTransaction columns, so
// a future processor just supplies its own populator returning this same shape.
export type PlatformCurrencyValue = {
  platformCurrencyAmount: number | null; // `amount` converted to platformCurrency, in cents
  platformCurrency: string | null;
  exchangeRate: number | null;
};

// Used when no platform-currency value is known (Checkout Session, free
// purchases, or a failed FX lookup). Spread into create data to set all columns.
export const EMPTY_PLATFORM_CURRENCY_VALUE: PlatformCurrencyValue = {
  platformCurrencyAmount: null,
  platformCurrency: null,
  exchangeRate: null,
};

// Shorthand for the `...(x ?? EMPTY_PLATFORM_CURRENCY_VALUE)` spread repeated at
// every UserTransaction.create() call site.
export const withPlatformCurrency = (value?: PlatformCurrencyValue) =>
  value ?? EMPTY_PLATFORM_CURRENCY_VALUE;

// Reuses the presentment->platform exchange_rate that Stripe applied to the
// application fee (the only part of the charge that lands on the platform) and
// applies it to the full amount. Returns nulls when there's no application fee
// (e.g. shouldSkipPlatformFee's MX/BR / 0% paths) — those rows drop out of
// platform-currency aggregates. PaymentIntent flows only (online + terminal).
// Never throws: errors fall back to nulls (logged) so they can't block the
// purchase, letting callers use the result without a try/catch.
export const getPlatformCurrencyValueFromIntent = async (
  paymentIntent: Stripe.PaymentIntent,
  stripeAccount: string
): Promise<PlatformCurrencyValue> => {
  try {
    const chargeId =
      typeof paymentIntent.latest_charge === "string"
        ? paymentIntent.latest_charge
        : (paymentIntent.latest_charge?.id ?? "");
    if (!chargeId) return EMPTY_PLATFORM_CURRENCY_VALUE;

    // Charge is on the connected account; its application_fee id lives on the platform.
    const charge = await stripe.charges.retrieve(
      chargeId,
      {},
      { stripeAccount }
    );
    const applicationFeeId =
      typeof charge.application_fee === "string"
        ? charge.application_fee
        : (charge.application_fee?.id ?? "");
    if (!applicationFeeId) return EMPTY_PLATFORM_CURRENCY_VALUE;

    // No { stripeAccount }: application fees live on the platform account.
    const applicationFee = await stripe.applicationFees.retrieve(
      applicationFeeId,
      { expand: ["balance_transaction"] }
    );

    const balanceTransaction = applicationFee.balance_transaction;
    if (!balanceTransaction || typeof balanceTransaction === "string") {
      // Not yet settled — record nothing rather than a wrong figure.
      return EMPTY_PLATFORM_CURRENCY_VALUE;
    }

    // exchange_rate is null when presentment currency == platform currency (rate 1).
    const exchangeRate = balanceTransaction.exchange_rate ?? 1;
    const amount = paymentIntent.amount_received ?? paymentIntent.amount ?? 0;

    return {
      platformCurrencyAmount: Math.round(amount * exchangeRate),
      platformCurrency: balanceTransaction.currency,
      exchangeRate,
    };
  } catch (e) {
    logger.warn(
      `getPlatformCurrencyValueFromIntent: could not determine platform currency value for ${paymentIntent.id}: ${e}`
    );
    return EMPTY_PLATFORM_CURRENCY_VALUE;
  }
};

const getApplicationFee = async (session?: Stripe.Checkout.Session) => {
  try {
    const paymentIntentId =
      typeof session?.payment_intent === "string"
        ? session?.payment_intent
        : (session?.payment_intent?.id ?? null);

    const stripeAccount = session?.metadata?.stripeAccountId ?? null;

    if (!paymentIntentId) {
      logger.warn("No payment intent ID found in session metadata");
      return { applicationFee: 0, paymentProcessorFee: 0 };
    }
    if (!stripeAccount) {
      logger.warn("No stripe account found in session metadata");
      return { applicationFee: 0, paymentProcessorFee: 0 };
    }
    const paymentIntent = await getPaymentIntent(
      paymentIntentId,
      stripeAccount
    );

    const fees = await getFeesFromPaymentIntent(paymentIntent, stripeAccount);

    logger.info(
      `Application fee: ${fees.applicationFee}, Stripe fee: ${fees.paymentProcessorFee}`
    );

    return fees;
  } catch (error) {
    // A fee lookup failure must not abort recording the purchase or sending its
    // confirmation emails — otherwise the charge succeeds in Stripe but leaves
    // no record in Mirlo and notifies no one. Fall back to zero fees (same as
    // when the metadata is missing above) and log loudly so it can be
    // reconciled. The purchase still gets recorded.
    logger.error(
      `Error retrieving application fee for session ${session?.id}, recording purchase without fee details:`,
      error
    );
    return { applicationFee: 0, paymentProcessorFee: 0 };
  }
};

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
  session?: Stripe.Checkout.Session,
  newUser?: boolean,
  platformCurrencyValue?: PlatformCurrencyValue
) => {
  try {
    const { applicationUrl } = await getClient();
    const { applicationFee, paymentProcessorFee } =
      await getApplicationFee(session);
    const amount = session?.amount_total ?? 0;
    const pricePaid = amount;
    const currencyPaid = session?.currency ?? "usd";
    const paymentProcessorKey = session?.id ?? null;

    const transaction = await prisma.userTransaction.create({
      data: {
        userId: Number(userId),
        amount: pricePaid,
        currency: currencyPaid,
        platformCut: applicationFee ?? null,
        stripeId: paymentProcessorKey ?? "",
        stripeCut: paymentProcessorFee ?? null,
        ...withPlatformCurrency(platformCurrencyValue),
        paymentStatus: "COMPLETED",
        discountPercent: session?.metadata?.discountPercent
          ? Number(session.metadata.discountPercent)
          : undefined,
      },
    });

    const purchase = await registerPurchase({
      userId: Number(userId),
      trackGroupId: Number(trackGroupId),
      pricePaid: session?.amount_total ?? 0,
      message: session?.metadata?.message ?? null,
      currencyPaid: session?.currency ?? "usd",
      paymentProcessorKey: session?.id ?? null,
      platformCut: applicationFee ?? null,
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
            message: session?.metadata?.message,
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
      `Error creating album purchase for trackGroupId ${trackGroupId}, userId ${userId}, session ${session?.id}:`,
      e
    );
  }
};

export const handleCataloguePurchase = async (
  userId: number,
  artistId: number,
  session?: Stripe.Checkout.Session
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
    const artistTrackGroups = await prisma.trackGroup.findMany({
      where: {
        profileId: artistId,
        OR: [{ paymentToUserId: null }, { paymentToUserId: artist?.userId }],
        releaseDate: {
          lte: new Date(),
        },
        isHiddenTrackGroupForSongDrafts: false,
        publishedAt: { lte: new Date() },
        isGettable: true,
        adminEnabled: true,
      },
      include: {
        profile: true,
      },
    });

    const amountPaidPerTrackGroup =
      (session?.amount_total ?? 0) / artistTrackGroups.length;

    const { applicationFee, paymentProcessorFee } =
      await getApplicationFee(session);
    const appFeePerTrackGroup =
      (applicationFee ?? 0) / artistTrackGroups.length;

    const pricePaid = session?.amount_total ?? 0;
    const currencyPaid = session?.currency ?? "usd";
    const paymentProcessorKey = session?.id ?? null;

    // We only create one transaction for the whole purchase
    // so that we can use the same transaction for all track groups
    const transaction = await prisma.userTransaction.create({
      data: {
        userId: Number(userId),
        amount: pricePaid,
        currency: currencyPaid,
        platformCut: paymentProcessorFee ?? null,
        stripeId: paymentProcessorKey ?? "",
        stripeCut: paymentProcessorFee ?? null,
        paymentStatus: "COMPLETED",
      },
    });

    await Promise.all(
      artistTrackGroups.map(async (trackGroup) => {
        await registerPurchase({
          userId: Number(userId),
          trackGroupId: Number(trackGroup.id),
          message: session?.metadata?.message ?? null,
          pricePaid: Number(amountPaidPerTrackGroup.toFixed(2)),
          currencyPaid: session?.currency ?? "usd",
          paymentProcessorKey: session?.id ?? null,
          platformCut: Number(appFeePerTrackGroup.toFixed(2)),
          transactionId: transaction.id,
        });
      })
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
            trackGroups: artistTrackGroups.map((tg) =>
              processSingleTrackGroup(tg)
            ),
            email: user.email,
            client: applicationUrl,
            host: process.env.API_DOMAIN,
          },
        },
      } as Job);

      const pricePaid = session?.amount_total ?? 0;
      await sendMail({
        data: {
          template: "catalogue-purchase-artist-notification",
          message: {
            to: artist.user.email,
          },
          locals: {
            artist: serializedArtist,
            pricePaid,
            currencyPaid: session?.currency ?? "usd",
            platformCut:
              calculateAppFee(pricePaid, session?.currency ?? "usd") ?? 0 / 100,
            email: user.email,
          },
        },
      } as Job);
    }
  } catch (e) {
    logger.error(
      `Error creating catalogue purchase for profileId ${artistId}, userId ${userId}, session ${session?.id}:`,
      e
    );
  }
};

export const handleTrackPurchase = async (
  userId: number,
  trackId: number,
  session?: Stripe.Checkout.Session,
  platformCurrencyValue?: PlatformCurrencyValue
) => {
  try {
    const { applicationFee } = await getApplicationFee(session);
    const purchase = await registerTrackPurchase({
      userId: Number(userId),
      trackId: Number(trackId),
      pricePaid: session?.amount_total ?? 0,
      message: session?.metadata?.message ?? null,
      currencyPaid: session?.currency ?? "usd",
      paymentProcessorKey: session?.id ?? null,
      platformCut: applicationFee ?? null,
      discountPercent: session?.metadata?.discountPercent
        ? Number(session.metadata.discountPercent)
        : undefined,
      platformCurrencyValue,
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
      `Error creating track purchase for trackId ${trackId}, userId ${userId}, session ${session?.id}:`,
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
    user: User;
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

export const sendSaleEmails = async (
  artist: Profile & {
    user: User;
    properties?: { emails?: { purchase?: string } } | null;
  },
  purchaser: User,
  transactionIds: string[],
  message?: string
) => {
  try {
    const { applicationUrl } = await getClient();
    const transactions = await prisma.userTransaction.findMany({
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

    const serializedTransactions = transactions.map(
      (t) =>
        serializeUserTransaction(t, {
          emailShape: true,
        }) as unknown as PurchaseTransaction
    );
    const serializedArtist = processSingleArtist(
      artist
    ) as unknown as PurchaseReceiptEmailType["artist"];

    await sendMail<PurchaseReceiptEmailType>({
      data: {
        template: "purchase-receipt",
        message: {
          to: purchaser.email,
        },
        locals: {
          artist: serializedArtist,
          transactions: serializedTransactions,
          email: purchaser.email,
          client: applicationUrl,
          host: process.env.API_DOMAIN,
        } as PurchaseReceiptEmailType,
      },
    } as Job);

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
  session?: Stripe.Checkout.Session,
  platformCurrencyValue?: PlatformCurrencyValue
) => {
  try {
    const { applicationFee, paymentProcessorFee } =
      await getApplicationFee(session);

    const transaction = await prisma.userTransaction.create({
      data: {
        userId: Number(userId),
        amount: session?.amount_total ?? 0,
        currency: session?.currency ?? "usd",
        platformCut: applicationFee ?? null,
        stripeCut: paymentProcessorFee ?? null,
        stripeId: session?.id ?? "",
        ...withPlatformCurrency(platformCurrencyValue),
        paymentStatus: "COMPLETED",
      },
    });

    const createdTip = await prisma.userProfileTip.create({
      data: {
        userId,
        profileId: artistId,
        message: session?.metadata?.message ?? null,
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

export const handleArtistMerchPurchase = async (
  userId: number,
  session: Stripe.Checkout.Session,
  stripeAccount: string
) => {
  try {
    const purchases = (
      await Promise.all(
        session?.line_items?.data.map(async (item) => {
          const stripeProduct = item.price?.product;
          let merchProduct;
          let stripeProductId =
            typeof stripeProduct === "string"
              ? stripeProduct
              : stripeProduct?.id;

          // Use the product of this line item to find the
          // relevant item in our database. For merch this
          // can be either product directly, or something defined
          // by the merch options. We create a product for each possible
          // combiunation of merch option
          if (stripeProductId) {
            const product = await stripe.products.retrieve(
              stripeProductId,
              undefined,
              { stripeAccount }
            );

            if (product.metadata.merchOptionIds) {
              const optionIds =
                product.metadata.merchOptionIds.split(OPTION_JOINER);
              merchProduct = await prisma.merch.findFirst({
                where: {
                  optionTypes: {
                    some: { options: { some: { id: { in: optionIds } } } },
                  },
                },
                include: {
                  optionTypes: {
                    include: { options: true },
                  },
                },
              });
            } else {
              merchProduct = await prisma.merch.findFirst({
                where: {
                  stripeProductKey: product.id,
                },
                include: {
                  optionTypes: {
                    include: { options: true },
                  },
                },
              });
            }

            if (merchProduct) {
              const optionIds =
                product.metadata?.merchOptionIds?.split(OPTION_JOINER);

              const options: MerchOption[] = [];
              const optionsToReduceQuantity: MerchOption[] = [];
              merchProduct.optionTypes.forEach((ot) =>
                ot.options.forEach((o) => {
                  if (optionIds?.includes(o.id)) {
                    options.push(o);
                    if (o.quantityRemaining) {
                      optionsToReduceQuantity.push(o);
                    }
                  }
                })
              );

              logger.info(
                `handleArtistMerchPurchase: userId: ${userId}, merchId: ${merchProduct.id}, amountPaid: ${item.amount_total}${item.currency}, options: ${options.map((o) => o.id).join(", ")}`
              );

              const { applicationFee, paymentProcessorFee } =
                await getApplicationFee(session);

              const transaction = await prisma.userTransaction.create({
                data: {
                  userId,
                  amount: item.amount_total ?? 0,
                  currency: item.currency ?? "usd",
                  platformCut: applicationFee ?? null,
                  stripeCut: paymentProcessorFee ?? null,
                  stripeId: session?.id ?? "",
                  shippingFeeAmount: session.shipping_cost?.amount_total ?? 0,
                  paymentStatus: "COMPLETED",
                  discountPercent: session?.metadata?.discountPercent
                    ? Number(session.metadata.discountPercent)
                    : undefined,
                },
              });

              const createdMerchPurchase = await prisma.merchPurchase.create({
                data: {
                  userId,
                  merchId: merchProduct.id,
                  fulfillmentStatus: "NO_PROGRESS",
                  message: session?.metadata?.message ?? null,
                  shippingAddress: {
                    ...session?.shipping_details?.address,
                    name: session?.shipping_details?.name,
                    phone: session?.shipping_details?.phone,
                  },
                  billingAddress: session?.customer_details?.address,
                  quantity: item.quantity ?? 1,
                  transactionId: transaction.id,
                  options: {
                    connect: options.map((o) => ({
                      id: o.id,
                    })),
                  },
                },
              });

              if (merchProduct.includePurchaseTrackGroupId) {
                try {
                  await prisma.userTrackGroupPurchase.create({
                    data: {
                      trackGroupId: merchProduct.includePurchaseTrackGroupId,
                      userId: createdMerchPurchase.userId,
                      proGratis: true,
                    },
                  });
                } catch (e: any) {
                  if (
                    e instanceof PrismaClientKnownRequestError ||
                    e.name === "PrismaClientKnownRequestError"
                  ) {
                    if (e.code !== "P2002") {
                      throw e;
                    }
                  }
                }
              }

              const merch = await prisma.merch.findFirst({
                where: { id: createdMerchPurchase.merchId },
              });

              if (
                optionsToReduceQuantity.length === 0 &&
                merch?.quantityRemaining
              ) {
                await prisma.merch.update({
                  where: {
                    id: createdMerchPurchase.merchId,
                  },
                  data: {
                    quantityRemaining:
                      merch.quantityRemaining - createdMerchPurchase.quantity,
                  },
                });
              } else if (optionsToReduceQuantity.length > 0) {
                await Promise.all(
                  optionsToReduceQuantity.map((option) => {
                    return prisma.merchOption.update({
                      where: {
                        id: option.id,
                      },
                      data: {
                        quantityRemaining:
                          (option.quantityRemaining ?? 0) -
                          createdMerchPurchase.quantity,
                      },
                    });
                  })
                );
              }
              const refreshedMerchPurchase =
                await prisma.merchPurchase.findFirst({
                  where: {
                    id: createdMerchPurchase.id,
                  },
                  include: {
                    merch: {
                      include: { profile: { include: { user: true } } },
                    },
                    options: true,
                    transaction: true,
                  },
                });

              if (!refreshedMerchPurchase?.transaction) {
                return null;
              }

              const platformCut = await calculateAppFee(
                refreshedMerchPurchase.transaction.amount,
                refreshedMerchPurchase.transaction.currency
              );

              return {
                ...refreshedMerchPurchase,
                artistCut:
                  (refreshedMerchPurchase?.transaction.amount ?? 0) -
                  platformCut,
                platformCut,
              };
            }
          }
        }) ?? []
      )
    ).filter((o) => !!o);

    const purchaser = await prisma.user.findFirst({
      where: {
        id: userId,
      },
    });

    if (purchaser && purchases.length > 0 && purchases?.[0]?.merch?.profile) {
      await sendSaleEmails(
        purchases[0].merch.profile,
        purchaser,
        (purchases
          .map((p) => p?.transaction?.id)
          .filter((id) => !!id) as string[]) ?? [],
        session?.metadata?.message
      );
    }

    return purchases;
  } catch (e) {
    logger.error(`Error creating merch purchase: ${e}`);
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
  session: Stripe.Checkout.Session
) => {
  try {
    const { applicationFee } = await getApplicationFee(session);
    await registerSubscription({
      userId: Number(userId),
      tierId: Number(tierId),
      amount: session.amount_total ?? 0,
      paymentProcessorKey: session.subscription as string,
      platformCut: applicationFee ?? null,
      shippingAddress: session.shipping_details ?? null,
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
