import prisma from "@mirlo/prisma";
import {
  Artist,
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
import { calculateAppFee } from "./processingPayments";
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
    const paymentIntentLatestCharge = await stripe.charges.retrieve(
      typeof paymentIntent.latest_charge === "string"
        ? paymentIntent.latest_charge
        : (paymentIntent.latest_charge?.id ?? ""),
      { expand: ["balance_transaction"] },
      { stripeAccount }
    );

    const balance_transaction =
      paymentIntentLatestCharge.balance_transaction as
        | Stripe.BalanceTransaction
        | undefined;

    const stripeFee = balance_transaction?.fee_details.find(
      (fee) => fee.type === "stripe_fee"
    );

    logger.info(
      `Application fee: ${paymentIntent.application_fee_amount}, Stripe fee: ${stripeFee?.amount}`
    );

    return {
      applicationFee: paymentIntent.application_fee_amount ?? 0,
      paymentProcessorFee: stripeFee?.amount ?? 0,
    };
  } catch (error) {
    console.trace(error);
    logger.error(`Error retrieving application fee: ${error}`);
    throw new Error("Failed to retrieve application fee");
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
  newUser?: boolean
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
        artist: {
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
            trackGroup,
            purchase,
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
                  artist: true,
                },
              },
            },
          },
        },
      });

      await sendMail<ArtistPurchaseNotificationEmailType>({
        data: {
          template: "artist-purchase-notification",
          message: {
            to:
              trackGroup.paymentToUser?.email ??
              trackGroup.artist.paymentToUser?.email ??
              trackGroup.artist.user.email,
            cc:
              trackGroup.paymentToUser?.accountingEmail ??
              trackGroup.artist.paymentToUser?.accountingEmail ??
              trackGroup.artist.user.accountingEmail,
          },
          locals: {
            transactions,
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
        `New album purchase: <i>${trackGroup.title}</i> by ${trackGroup.artist.name}, purchased by <b>${user.email}</b>`
      );
    }

    return purchase;
  } catch (e) {
    logger.error(`Error creating album purchase: ${e}`);
  }
};

export const handleCataloguePurchase = async (
  userId: number,
  artistId: number,
  session?: Stripe.Checkout.Session
) => {
  try {
    const { applicationUrl } = await getClient();
    const artist = await prisma.artist.findFirst({
      where: {
        id: artistId,
      },
      include: {
        user: true,
      },
    });
    const artistTrackGroups = await prisma.trackGroup.findMany({
      where: {
        artistId: artistId,
        OR: [{ paymentToUserId: null }, { paymentToUserId: artist?.userId }],
        releaseDate: {
          lte: new Date(),
        },
        isDrafts: false,
        publishedAt: { lte: new Date() },
        isGettable: true,
        adminEnabled: true,
      },
      include: {
        artist: true,
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
      await sendMail({
        data: {
          template: "catalogue-receipt",
          message: {
            to: user.email,
          },
          locals: {
            artist,
            trackGroups: artistTrackGroups,
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
            artist,
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
    logger.error(`Error creating album purchase: ${e}`);
  }
};

export const handleTrackPurchase = async (
  userId: number,
  trackId: number,
  session?: Stripe.Checkout.Session
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
            artist: {
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
      await sendSaleEmails(track.trackGroup.artist, user, [
        purchase.transactionId,
      ]);
    }

    return purchase;
  } catch (e) {
    logger.error(`Error creating album purchase: ${e}`);
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
      trackGroup: { title: string; id: number };
      title: string;
      id: number;
    };
  }[];
  merchPurchases?: {
    merchId: string;
    options: { name: string }[];
    merch: { title: string; id: string };
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

const sendSaleEmails = async (
  artist: {
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
            artist: {
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
                artist: {
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
                artist: {
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
                    artist: {
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

    await sendMail<PurchaseReceiptEmailType>({
      data: {
        template: "purchase-receipt",
        message: {
          to: purchaser.email,
        },
        locals: {
          artist,
          transactions,
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
          artist,
          transactions,
          totalGross: transactions.reduce((acc, t) => acc + t.amount, 0),
          totalNet: transactions.reduce(
            (acc, t) =>
              acc + (t.amount - (t.platformCut ?? 0) - (t.stripeCut ?? 0)),
            0
          ),
          currency: transactions[0]?.currency ?? "usd",
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
  session?: Stripe.Checkout.Session
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
        paymentStatus: "COMPLETED",
      },
    });

    const createdTip = await prisma.userArtistTip.create({
      data: {
        userId,
        artistId,
        message: session?.metadata?.message ?? null,
        transactionId: transaction.id,
      },
    });

    const tip = await prisma.userArtistTip.findFirst({
      where: {
        id: createdTip.id,
      },
      include: { artist: { include: { user: true, subscriptionTiers: true } } },
    });

    const user = await prisma.user.findFirst({
      where: {
        id: userId,
      },
    });

    if (tip) {
      subscribeUserToArtist(tip.artist, user);
    }

    if (user && tip) {
      await sendSaleEmails(tip.artist, user, [transaction.id]);
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
                      include: { artist: { include: { user: true } } },
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

    if (purchaser && purchases.length > 0 && purchases?.[0]?.merch?.artist) {
      await sendSaleEmails(
        purchases[0].merch.artist,
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
  artist: Artist;
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
  artist: Artist;
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
      currency: session.currency ?? "usd",
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
  stripeId: string
) => {
  const transaction = await prisma.userTransaction.create({
    data: {
      userId: pledge.userId,
      amount: pledge.amount,
      currency: pledge.fundraiser.trackGroups[0].currency ?? "usd",
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
              currency: true,
              urlSlug: true,
              artist: {
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

  await sendMailQueue.add("send-mail", {
    template: "fundraiser-success",
    message: {
      to: pledge.user.email,
    },
    locals: {
      artist: pledge.fundraiser.trackGroups[0].artist,
      email: encodeURIComponent(pledge.user.email),
      host: process.env.API_DOMAIN,
      trackGroup: pledge.fundraiser.trackGroups[0],
      currency: pledge.fundraiser.trackGroups[0].currency,
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
            include: { trackGroups: { include: { artist: true } } },
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

  await sendMailQueue.add("send-mail", {
    template: "charge-failure",
    message: {
      to: transaction.associatedPledge.user.email,
    },
    locals: {
      artist: transaction.associatedPledge.fundraiser.trackGroups[0].artist,
      email: encodeURIComponent(transaction.associatedPledge?.user.email),
      host: process.env.API_DOMAIN,
      cardChargeContext: `your pledge to "${transaction.associatedPledge.fundraiser.trackGroups[0].artist.name}'s ${transaction.associatedPledge.fundraiser.trackGroups[0].title}" fundraiser`,
      currency: transaction.associatedPledge.fundraiser.trackGroups[0].currency,
      pledgedAmountFormatted: transaction.associatedPledge.amount / 100,
      client: applicationUrl,
      urlParams,
    },
  });
};
