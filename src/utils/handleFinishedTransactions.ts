import Stripe from "stripe";
import prisma from "@mirlo/prisma";
import { Artist, MerchOption, TrackGroup } from "@mirlo/prisma/client";

import { logger } from "../logger";
import sendMail from "../jobs/send-mail";
import { registerPurchase, registerTrackPurchase } from "./trackGroup";
import { registerSubscription } from "./subscriptionTier";
import { getSiteSettings } from "./settings";
import { Job } from "bullmq";
import stripe, { calculateAppFee, OPTION_JOINER } from "./stripe";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { sendBasecampAMessage } from "./basecamp";

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

    if (paymentIntent.application_fee_amount) {
      return {
        applicationFee: paymentIntent.application_fee_amount,
        paymentProcessorFee: stripeFee?.amount ?? 0,
      };
    } else {
      logger.warn(
        `No application fee found for payment intent ${paymentIntentId}`
      );
      return { applicationFee: 0, paymentProcessorFee: 0 };
    }
  } catch (error) {
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
    const { applicationFee, paymentProcessorFee } =
      await getApplicationFee(session);
    const amount = session?.amount_total ?? 0;
    const pricePaid = amount;
    const currencyPaid = session?.currency ?? "USD";
    const paymentProcessorKey = session?.id ?? null;

    const transaction = await prisma.userTransaction.create({
      data: {
        userId: Number(userId),
        amount: pricePaid,
        currency: currencyPaid,
        platformCut: applicationFee ?? null,
        stripeId: paymentProcessorKey ?? "",
        stripeCut: paymentProcessorFee ?? null,
      },
    });

    const purchase = await registerPurchase({
      userId: Number(userId),
      trackGroupId: Number(trackGroupId),
      pricePaid: session?.amount_total ?? 0,
      message: session?.metadata?.message ?? null,
      currencyPaid: session?.currency ?? "USD",
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
          },
        },
        paymentToUser: true,
      },
    });

    if (user && trackGroup && purchase) {
      const isBeforeReleaseDate = new Date(trackGroup.releaseDate) > new Date();

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
            client: process.env.REACT_APP_CLIENT_DOMAIN,
            host: process.env.API_DOMAIN,
          },
        },
      } as Job);

      await sendMail<AlbumPurchaseArtistNotificationEmailType>({
        data: {
          template: "album-purchase-artist-notification",
          message: {
            to: trackGroup.paymentToUser?.email ?? trackGroup.artist.user.email,
          },
          locals: {
            trackGroup,
            purchase,
            email: user.email,
          } as AlbumPurchaseArtistNotificationEmailType,
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
        published: true,
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
    const currencyPaid = session?.currency ?? "USD";
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
            client: process.env.REACT_APP_CLIENT_DOMAIN,
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
  session?: Stripe.Checkout.Session,
  newUser?: boolean
) => {
  try {
    const { applicationFee } = await getApplicationFee(session);
    const purchase = await registerTrackPurchase({
      userId: Number(userId),
      trackId: Number(trackId),
      pricePaid: session?.amount_total ?? 0,
      message: session?.metadata?.message ?? null,
      currencyPaid: session?.currency ?? "USD",
      paymentProcessorKey: session?.id ?? null,
      platformCut: applicationFee ?? null,
    });

    const settings = await getSiteSettings();

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

    if (user && track && purchase) {
      const isBeforeReleaseDate =
        new Date(track.trackGroup.releaseDate) > new Date();

      await sendMail<TrackPurchaseEmailType>({
        data: {
          template: newUser ? "track-download" : "track-purchase-receipt",
          message: {
            to: user.email,
          },
          locals: {
            track,
            purchase,
            isBeforeReleaseDate,
            token: purchase.singleDownloadToken,
            email: user.email,
            client: process.env.REACT_APP_CLIENT_DOMAIN,
            host: process.env.API_DOMAIN,
          } as TrackPurchaseEmailType,
        },
      } as Job);

      const pricePaid = purchase.pricePaid / 100;

      await sendMail<TrackPurchaseArtistNotificationEmailType>({
        data: {
          template: "track-purchase-artist-notification",
          message: {
            to:
              track.trackGroup.paymentToUser?.email ??
              track.trackGroup.artist.user.email,
          },
          locals: {
            track,
            purchase,
            message: purchase.message ?? null,
            pricePaid,
            platformCut:
              ((track.trackGroup.platformPercent ?? settings.platformPercent) *
                pricePaid) /
              100,
            email: user.email,
          } as TrackPurchaseArtistNotificationEmailType,
        },
      } as Job);
    }

    return purchase;
  } catch (e) {
    logger.error(`Error creating album purchase: ${e}`);
  }
};

export type ArtistTipReceiptEmailType = {
  tip: {
    id: string;
    userId: number;
    artist: {
      name: string;
      properties?: { emails?: { support?: string } };
    };
    artistId: number;
    pricePaid: number;
    currencyPaid: string;
  };
  pricePaid: number;
  email: string;
};

export type ArtistTipNotificationEmailType = {
  tip: {
    id: string;
    userId: number;
    artistId: number;
    pricePaid: number;
    message: string | null;
  };
  pricePaid: number;
  platformCut: number;
  email: string;
};

export const handleArtistGift = async (
  userId: number,
  artistId: number,
  session?: Stripe.Checkout.Session
) => {
  try {
    const { applicationFee } = await getApplicationFee(session);
    const createdTip = await prisma.userArtistTip.create({
      data: {
        userId,
        artistId,
        pricePaid: session?.amount_total ?? 0,
        currencyPaid: session?.currency ?? "USD",
        stripeSessionKey: session?.id ?? null,
        message: session?.metadata?.message ?? null,
        platformCut: applicationFee ?? null,
      },
    });

    const tip = await prisma.userArtistTip.findFirst({
      where: {
        id: createdTip.id,
      },
      include: { artist: { include: { user: true } } },
    });

    const user = await prisma.user.findFirst({
      where: {
        id: userId,
      },
    });

    if (user && tip) {
      const pricePaid = tip.pricePaid / 100;

      await sendMail<ArtistTipReceiptEmailType>({
        data: {
          template: "artist-tip-receipt",
          message: {
            to: user.email,
          },
          locals: {
            tip,
            email: user.email,
            pricePaid,
            client: process.env.REACT_APP_CLIENT_DOMAIN,
            host: process.env.API_DOMAIN,
          } as ArtistTipReceiptEmailType,
        },
      } as Job);

      const platformCut = await calculateAppFee(pricePaid, tip.currencyPaid);

      await sendMail<ArtistTipNotificationEmailType>({
        data: {
          template: "tip-artist-notification",
          message: {
            to: tip.artist.user.email,
          },
          locals: {
            tip,
            pricePaid,
            message: tip.message ?? null,
            platformCut,
            email: user.email,
          } as ArtistTipNotificationEmailType,
        },
      } as Job);
    }

    return tip;
  } catch (e) {
    logger.error(`Error creating tip: ${e}`);
    throw e;
  }
};

export type ArtistMerchPurchaseReceiptEmailType = {
  artist: Artist;
  purchases: {
    artistCut: number;
    platformCut: number;
    options: MerchOption[];
    merchId: string;
    merch: {
      title: string;
    };
    quantity: string;
    currencyPaid: string;
    amountPaid: number;
  }[];
};

export type TellArtistAboutMerchPurchaseEmailType = {
  artist: Artist;
  email: string;
  purchases: {
    merchId: string;
    merch: {
      title: string;
    };
    quantity: string;
    currencyPaid: string;
    amountPaid: number;
  }[];
};

// FIXME: is it possible to refactor all checkout sessions to use line_items
// so that we can use the same email etc for everything?
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
                },
              });

              const createdMerchPurchase = await prisma.merchPurchase.create({
                data: {
                  userId,
                  merchId: merchProduct.id,
                  amountPaid: item.amount_total ?? 0,
                  currencyPaid: item.currency ?? "USD",
                  stripeTransactionKey: session?.id ?? null,
                  fulfillmentStatus: "NO_PROGRESS",
                  message: session?.metadata?.message ?? null,
                  shippingAddress: session?.shipping_details?.address,
                  billingAddress: session?.customer_details?.address,
                  platformCut: applicationFee ?? null,
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
              const merchPurchase = await prisma.merchPurchase.findFirst({
                where: {
                  id: createdMerchPurchase.id,
                },
                include: {
                  merch: {
                    include: { artist: { include: { user: true } } },
                  },
                  options: true,
                },
              });
              const platformCut = await calculateAppFee(
                createdMerchPurchase.amountPaid,
                createdMerchPurchase.currencyPaid
              );

              return {
                ...merchPurchase,
                artistCut: (merchPurchase?.amountPaid ?? 0) - platformCut,
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
      await sendMail<ArtistMerchPurchaseReceiptEmailType>({
        data: {
          template: "artist-merch-purchase-receipt",
          message: {
            to: purchaser.email,
          },
          locals: {
            purchases,
            email: purchaser.email,
            artist: purchases?.[0].merch.artist,
            client: process.env.REACT_APP_CLIENT_DOMAIN,
            host: process.env.API_DOMAIN,
          },
        },
      } as Job);

      await sendMail<TellArtistAboutMerchPurchaseEmailType>({
        data: {
          template: "tell-artist-about-merch-purchase",
          message: {
            to: purchases?.[0]?.merch?.artist.user.email,
          },
          locals: {
            message: session?.metadata?.message ?? null,
            purchases,
            artist: purchases[0].merch.artist,
            calculateAppFee,
            email: purchaser.email,
          },
        },
      } as Job);
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
    const artistUserSubscription = await registerSubscription({
      userId: Number(userId),
      tierId: Number(tierId),
      amount: session.amount_total ?? 0,
      currency: session.currency ?? "USD",
      paymentProcessorKey: session.subscription as string, // FIXME: should this be session id? Maybe subscriptionId?
      platformCut: applicationFee ?? null,
    });

    if (artistUserSubscription) {
      await sendMail<ArtistSubscriptionReceiptEmailType>({
        data: {
          template: "artist-subscription-receipt",
          message: {
            to: artistUserSubscription.user.email,
          },
          locals: {
            interval: artistUserSubscription.artistSubscriptionTier.interval,
            artist: artistUserSubscription.artistSubscriptionTier.artist,
            artistUserSubscription,
            user: artistUserSubscription.user,
            email: artistUserSubscription.user.email,
            client: process.env.REACT_APP_CLIENT_DOMAIN,
            host: process.env.API_DOMAIN,
          },
        },
      } as Job);

      await sendMail<ArtistNewSubscriberAnnounceEmailType>({
        data: {
          template: "artist-new-subscriber-announce",
          message: {
            to: artistUserSubscription.artistSubscriptionTier.artist.user.email,
          },
          locals: {
            interval: artistUserSubscription.artistSubscriptionTier.interval,
            artist: artistUserSubscription.artistSubscriptionTier.artist,
            artistUserSubscription,
            user: artistUserSubscription.user,
            email: artistUserSubscription.user.email,
            client: process.env.REACT_APP_CLIENT_DOMAIN,
            host: process.env.API_DOMAIN,
          },
        },
      } as Job);
    }
  } catch (e) {
    logger.error(`Error creating subscription: ${e}`);
  }
};
