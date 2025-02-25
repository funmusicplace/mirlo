import Stripe from "stripe";
import prisma from "@mirlo/prisma";
import { MerchOption } from "@mirlo/prisma/client";

import { logger } from "../logger";
import sendMail from "../jobs/send-mail";
import { registerPurchase } from "./trackGroup";
import { registerSubscription } from "./subscriptionTier";
import { getSiteSettings } from "./settings";
import { Job } from "bullmq";
import stripe, { calculateAppFee, OPTION_JOINER } from "./stripe";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

export const handleTrackGroupPurchase = async (
  userId: number,
  trackGroupId: number,
  session?: Stripe.Checkout.Session,
  newUser?: boolean
) => {
  try {
    const purchase = await registerPurchase({
      userId: Number(userId),
      trackGroupId: Number(trackGroupId),
      pricePaid: session?.amount_total ?? 0,
      currencyPaid: session?.currency ?? "USD",
      paymentProcessorKey: session?.id ?? null,
    });

    const settings = await getSiteSettings();

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

      await sendMail({
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

      const pricePaid = purchase.pricePaid / 100;

      await sendMail({
        data: {
          template: "album-purchase-artist-notification",
          message: {
            to: trackGroup.paymentToUser?.email ?? trackGroup.artist.user.email,
          },
          locals: {
            trackGroup,
            purchase,
            pricePaid,
            platformCut:
              ((trackGroup.platformPercent ?? settings.platformPercent) *
                pricePaid) /
              100,
            email: user.email,
          },
        },
      } as Job);
    }

    return purchase;
  } catch (e) {
    logger.error(`Error creating album purchase: ${e}`);
  }
};

export const handleArtistGift = async (
  userId: number,
  artistId: number,
  session?: Stripe.Checkout.Session
) => {
  try {
    const createdTip = await prisma.userArtistTip.create({
      data: {
        userId,
        artistId,
        pricePaid: session?.amount_total ?? 0,
        currencyPaid: session?.currency ?? "USD",
        stripeSessionKey: session?.id ?? null,
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

      await sendMail({
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
          },
        },
      } as Job);

      const platformCut = await calculateAppFee(pricePaid, tip.currencyPaid);

      await sendMail({
        data: {
          template: "tip-artist-notification",
          message: {
            to: tip.artist.user.email,
          },
          locals: {
            tip,
            pricePaid,
            platformCut,
            email: user.email,
          },
        },
      } as Job);
    }

    return tip;
  } catch (e) {
    logger.error(`Error creating tip: ${e}`);
    throw e;
  }
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
              merchProduct.optionTypes.forEach((ot) =>
                ot.options.forEach((o) => {
                  if (optionIds?.includes(o.id)) {
                    options.push(o);
                  }
                })
              );

              logger.info(
                `handleArtistMerchPurchase: userId: ${userId}, merchId: ${merchProduct.id}, amountPaid: ${item.amount_total}${item.currency}`
              );

              const createdMerchPurchase = await prisma.merchPurchase.create({
                data: {
                  userId,
                  merchId: merchProduct.id,
                  amountPaid: item.amount_total ?? 0,
                  currencyPaid: item.currency ?? "USD",
                  stripeTransactionKey: session?.id ?? null,
                  fulfillmentStatus: "NO_PROGRESS",
                  shippingAddress: session?.shipping_details?.address,
                  billingAddress: session?.customer_details?.address,
                  quantity: item.quantity ?? 1,
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
                      pricePaid: 0,
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

              if (merch?.quantityRemaining) {
                await prisma.merch.update({
                  where: {
                    id: createdMerchPurchase.merchId,
                  },
                  data: {
                    quantityRemaining:
                      merch.quantityRemaining - createdMerchPurchase.quantity,
                  },
                });
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
      await sendMail({
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

      await sendMail({
        data: {
          template: "tell-artist-about-merch-purchase",
          message: {
            to: purchases?.[0]?.merch?.artist.user.email,
          },
          locals: {
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

export const handleSubscription = async (
  userId: number,
  tierId: number,
  session: Stripe.Checkout.Session
) => {
  try {
    const artistUserSubscription = await registerSubscription({
      userId: Number(userId),
      tierId: Number(tierId),
      amount: session.amount_total ?? 0,
      currency: session.currency ?? "USD",
      paymentProcessorKey: session.subscription as string, // FIXME: should this be session id? Maybe subscriptionId?
    });

    if (artistUserSubscription) {
      await sendMail({
        data: {
          template: "artist-subscription-receipt",
          message: {
            to: artistUserSubscription.user.email,
          },
          locals: {
            artist: artistUserSubscription.artistSubscriptionTier.artist,
            artistUserSubscription,
            user: artistUserSubscription.user,
            email: artistUserSubscription.user.email,
            client: process.env.REACT_APP_CLIENT_DOMAIN,
            host: process.env.API_DOMAIN,
          },
        },
      } as Job);

      await sendMail({
        data: {
          template: "artist-new-subscriber-announce",
          message: {
            to: artistUserSubscription.artistSubscriptionTier.artist.user.email,
          },
          locals: {
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
