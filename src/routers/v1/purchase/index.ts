import prisma from "@mirlo/prisma";
import { NextFunction, Request, Response } from "express";

import {
  artistEditableByUser,
  userLoggedInWithoutRedirect,
} from "../../../auth/passport";
import { subscribeUserToArtist } from "../../../utils/artist";
import { buildCheckoutRedirectUrl, originOf } from "../../../utils/clientUrl";
import { AppError } from "../../../utils/error";
import { getClient } from "../../../utils/getClient";
import {
  handleTrackGroupPurchase,
  handleTrackPurchase,
} from "../../../utils/handleFinishedTransactions";
import {
  calculateMerchShippingCost,
  checkMerchStock,
  type MerchWithOptionsAndShipping,
  resolveMerchOptionIds,
} from "../../../utils/merch";
import { resolvePayee } from "../../../utils/payments/payee";
import { initiateFundraiserPledge } from "../../../utils/payments/pledge";
import {
  initiatePayment,
  type ResolvedItem,
} from "../../../utils/payments/purchase";
import {
  initiateOnlineSubscription,
  initiateSubscription,
} from "../../../utils/payments/subscription";
import { determinePrice } from "../../../utils/purchasing";
import { findUserDiscountPercentsForArtist } from "../../../utils/user";

type PurchaseItem =
  | { type: "trackGroup"; id: number; price?: string; message?: string }
  | { type: "track"; id: number; price?: string; message?: string }
  | {
      type: "merch";
      id: string;
      quantity?: number;
      price?: string;
      merchOptionIds?: string[];
      shippingDestinationId?: string;
      message?: string;
    }
  | { type: "tip"; amount: number; message?: string }
  | {
      type: "subscription";
      tierId: number;
      amount?: number;
      userName?: string;
    }
  | {
      type: "fundraiserPledge";
      fundraiserId: number;
      trackGroupId: number;
      price?: string;
      message?: string;
    };

type PostBody = {
  readerId?: string;
  artistId: number;
  items: PurchaseItem[];
  email?: string;
  hosted?: boolean;
  successUrl?: string;
};

type DigitalReleaseArtist = Parameters<typeof subscribeUserToArtist>[0] &
  Parameters<typeof resolvePayee>[0]["artist"] & { urlSlug: string | null };

export const resolveDigitalPurchaseItem = async <
  T extends "trackGroup" | "track",
>({
  type,
  id,
  loggedInUser,
  readerId,
  price,
  message,
  minPrice,
  platformPercent,
  artist,
  paymentToUser,
  releaseUrlSlug,
  releaseId,
  handleFreePurchase,
}: {
  type: T;
  id: number;
  loggedInUser?: Express.User;
  readerId?: string;
  price?: string;
  message?: string;
  minPrice: number | null;
  platformPercent?: number | null;
  artist: DigitalReleaseArtist;
  paymentToUser?: { stripeAccountId: string | null } | null;
  releaseUrlSlug: string | null;
  releaseId: number;
  handleFreePurchase: () => Promise<unknown>;
}): Promise<
  | { kind: "free"; redirectUrl: string }
  | { kind: "paid"; stripeAccountId?: string; item: ResolvedItem }
> => {
  const payee = resolvePayee({
    artist,
    releasePaymentToUser: paymentToUser,
  }) as {
    stripeAccountId: string | null;
  };
  const stripeAccountId = payee.stripeAccountId ?? undefined;

  if (loggedInUser) {
    await subscribeUserToArtist(artist, loggedInUser);
  }

  let discountPercent = 0;
  if (loggedInUser) {
    const discounts = await findUserDiscountPercentsForArtist(
      loggedInUser.id,
      artist.id
    );
    discountPercent = discounts.reduce(
      (max, d) => Math.max(max, d.digitalDiscountPercent ?? 0),
      0
    );
  }

  const { isPriceZero, priceNumber } = determinePrice(price, minPrice);

  if (isPriceZero && !readerId && loggedInUser) {
    await handleFreePurchase();
    return {
      kind: "free",
      redirectUrl: `/${artist.urlSlug ?? artist.id}/release/${
        releaseUrlSlug ?? releaseId
      }/download?email=${loggedInUser.email}`,
    };
  }

  const discountedAmount = discountPercent
    ? Math.round(priceNumber * (1 - discountPercent / 100))
    : priceNumber;

  return {
    kind: "paid",
    stripeAccountId,
    item: {
      type,
      id: String(id),
      quantity: 1,
      amount: discountedAmount,
      message,
      platformPercent,
    },
  };
};

export const resolveMerchPurchaseItem = (
  merch: MerchWithOptionsAndShipping,
  item: Extract<PurchaseItem, { type: "merch" }>
): {
  item: ResolvedItem;
  requiresShipping: boolean;
  allowedCountries: string[];
} => {
  const qty = item.quantity ?? 1;
  if (qty < 1) {
    throw new AppError({
      httpCode: 400,
      description: "quantity must be at least 1",
    });
  }

  const { options, additionalPricePerUnit } = resolveMerchOptionIds(
    merch,
    item.merchOptionIds
  );
  checkMerchStock(merch, options, qty);

  const { priceNumber } = determinePrice(item.price, merch.minPrice);

  const requiresShipping = merch.shippingDestinations.length > 0;
  let shippingCostCents = 0;
  let allowedCountries: string[] = [];
  if (requiresShipping) {
    if (!item.shippingDestinationId) {
      throw new AppError({
        httpCode: 400,
        description: "shippingDestinationId is required for this merch item",
      });
    }
    ({ costCents: shippingCostCents, allowedCountries } =
      calculateMerchShippingCost(
        merch.shippingDestinations,
        item.shippingDestinationId,
        qty
      ));
  }

  return {
    item: {
      type: "merch",
      id: merch.id,
      quantity: qty,
      amount: (priceNumber + additionalPricePerUnit) * qty + shippingCostCents,
      message: item.message,
      optionIds: options.map((o) => o.id),
      shippingDestinationId: item.shippingDestinationId,
      platformPercent: merch.platformPercent,
    },
    requiresShipping,
    allowedCountries,
  };
};

const assertAllowedSuccessUrl = (
  successUrl: string,
  mirloApplicationUrl: string,
  client?: { applicationUrl: string; allowedCorsOrigins: string[] }
) => {
  const target = originOf(successUrl);
  if (!target) {
    throw new AppError({ httpCode: 400, description: "Invalid successUrl" });
  }

  const allowed = new Set(
    [
      mirloApplicationUrl,
      client?.applicationUrl,
      ...(client?.allowedCorsOrigins ?? []),
    ]
      .map((v) => v && originOf(v))
      .filter((v): v is string => Boolean(v))
  );

  if (!allowed.has(target)) {
    throw new AppError({
      httpCode: 400,
      description: "successUrl origin is not allowed for this client",
    });
  }
};

export default function () {
  const operations = {
    POST: [userLoggedInWithoutRedirect, POST],
  };

  async function POST(req: Request, res: Response, next: NextFunction) {
    const { readerId, artistId, items, email, hosted, successUrl } =
      req.body as PostBody;
    const loggedInUser = req.user;
    const clientId = req.client?.id;

    try {
      if (!artistId || !items?.length) {
        throw new AppError({
          httpCode: 400,
          description: "artistId and items are required",
        });
      }

      if (readerId) {
        if (!loggedInUser) {
          throw new AppError({
            httpCode: 401,
            description:
              "Dispatching to a terminal reader requires authentication",
          });
        }
        await artistEditableByUser(artistId, loggedInUser);
      }

      const mirloClient = successUrl || hosted ? await getClient() : null;

      if (successUrl && mirloClient) {
        assertAllowedSuccessUrl(
          successUrl,
          mirloClient.applicationUrl,
          req.client ?? undefined
        );
      }

      if (!readerId && !loggedInUser && !email && !hosted) {
        throw new AppError({
          httpCode: 400,
          description:
            "email is required for a purchase without a logged-in user",
        });
      }

      const hasSubscription = items.some((i) => i.type === "subscription");
      if (hasSubscription && items.length > 1) {
        throw new AppError({
          httpCode: 400,
          description: "Subscription must be the only item in the cart",
        });
      }

      if (hasSubscription) {
        const subItem = items[0] as Extract<
          PurchaseItem,
          { type: "subscription" }
        >;

        if (readerId) {
          const { setupIntentId } = await initiateSubscription({
            readerId,
            artistId,
            tierId: subItem.tierId,
            amount: subItem.amount,
            userEmail: loggedInUser?.email ?? email ?? "",
            userId: loggedInUser ? String(loggedInUser.id) : undefined,
          });

          return res.status(200).json({ setupIntentId });
        }

        const result = await initiateOnlineSubscription({
          artistId,
          tierId: subItem.tierId,
          amount: subItem.amount,
          userEmail: loggedInUser?.email ?? email ?? "",
          userId: loggedInUser?.id,
          userName: subItem.userName,
          successUrl,
        });

        if (hosted && mirloClient && "clientSecret" in result) {
          const redirectUrl = buildCheckoutRedirectUrl(
            mirloClient.applicationUrl,
            "checkout",
            new URLSearchParams({
              intentId: result.setupIntentId,
              stripeAccountId: result.stripeAccountId,
            })
          );
          return res.status(200).json({ redirectUrl });
        }

        return res.status(200).json(result);
      }

      const hasFundraiserPledge = items.some(
        (i) => i.type === "fundraiserPledge"
      );
      if (hasFundraiserPledge && items.length > 1) {
        throw new AppError({
          httpCode: 400,
          description: "Fundraiser pledge must be the only item in the cart",
        });
      }

      if (hasFundraiserPledge) {
        if (readerId) {
          throw new AppError({
            httpCode: 400,
            description:
              "Fundraiser pledges are not supported on a terminal reader",
          });
        }

        const pledgeItem = items[0] as Extract<
          PurchaseItem,
          { type: "fundraiserPledge" }
        >;

        const result = await initiateFundraiserPledge({
          artistId,
          fundraiserId: pledgeItem.fundraiserId,
          trackGroupId: pledgeItem.trackGroupId,
          price: pledgeItem.price,
          message: pledgeItem.message,
          userEmail: loggedInUser?.email ?? email ?? "",
          userId: loggedInUser?.id,
        });

        if (hosted && mirloClient) {
          const redirectUrl = buildCheckoutRedirectUrl(
            mirloClient.applicationUrl,
            "checkout",
            new URLSearchParams({
              intentId: result.setupIntentId,
              stripeAccountId: result.stripeAccountId,
            })
          );
          return res.status(200).json({ redirectUrl });
        }

        return res.status(200).json(result);
      }

      const resolvedItems: ResolvedItem[] = [];
      let resolvedStripeAccountId: string | undefined;
      let requiresShipping = false;
      let allowedCountries: string[] | undefined;

      for (const item of items) {
        if (item.type === "trackGroup") {
          const tg = await prisma.trackGroup.findFirst({
            where: { id: item.id, profile: { id: artistId } },
            include: {
              paymentToUser: { select: { stripeAccountId: true } },
              profile: {
                include: {
                  user: true,
                  paymentToUser: true,
                  subscriptionTiers: true,
                },
              },
            },
          });
          if (!tg) {
            throw new AppError({
              httpCode: 404,
              description: `TrackGroup ${item.id} not found`,
            });
          }

          const result = await resolveDigitalPurchaseItem({
            type: "trackGroup",
            id: tg.id,
            loggedInUser,
            readerId,
            price: item.price,
            message: item.message,
            minPrice: tg.minPrice,
            platformPercent: tg.platformPercent,
            artist: tg.profile,
            paymentToUser: tg.paymentToUser,
            releaseUrlSlug: tg.urlSlug,
            releaseId: tg.id,
            handleFreePurchase: () =>
              handleTrackGroupPurchase(loggedInUser!.id, tg.id),
          });

          if (result.kind === "free") {
            return res.status(200).json({ redirectUrl: result.redirectUrl });
          }
          resolvedStripeAccountId = result.stripeAccountId;
          resolvedItems.push(result.item);
        } else if (item.type === "track") {
          const track = await prisma.track.findFirst({
            where: { id: item.id, trackGroup: { profileId: artistId } },
            include: {
              trackGroup: {
                include: {
                  profile: {
                    include: {
                      user: true,
                      paymentToUser: true,
                      subscriptionTiers: true,
                    },
                  },
                  paymentToUser: { select: { stripeAccountId: true } },
                },
              },
            },
          });
          if (!track) {
            throw new AppError({
              httpCode: 404,
              description: `Track ${item.id} not found`,
            });
          }

          const result = await resolveDigitalPurchaseItem({
            type: "track",
            id: track.id,
            loggedInUser,
            readerId,
            price: item.price,
            message: item.message,
            minPrice: track.minPrice,
            platformPercent: track.trackGroup.platformPercent,
            artist: track.trackGroup.profile,
            paymentToUser: track.trackGroup.paymentToUser,
            releaseUrlSlug: track.trackGroup.urlSlug,
            releaseId: track.trackGroup.id,
            handleFreePurchase: () =>
              handleTrackPurchase(loggedInUser!.id, track.id),
          });

          if (result.kind === "free") {
            return res.status(200).json({ redirectUrl: result.redirectUrl });
          }
          resolvedStripeAccountId = result.stripeAccountId;
          resolvedItems.push(result.item);
        } else if (item.type === "merch") {
          const merch: MerchWithOptionsAndShipping | null =
            await prisma.merch.findFirst({
              where: {
                id: item.id,
                profileId: artistId,
                isPublic: true,
                deletedAt: null,
              },
              include: {
                optionTypes: { include: { options: true } },
                shippingDestinations: true,
              },
            });
          if (!merch) {
            throw new AppError({
              httpCode: 404,
              description: `Merch ${item.id} not found`,
            });
          }

          const resolved = resolveMerchPurchaseItem(merch, item);
          resolvedItems.push(resolved.item);
          requiresShipping = requiresShipping || resolved.requiresShipping;
          if (resolved.requiresShipping) {
            allowedCountries = resolved.allowedCountries;
          }
        } else if (item.type === "tip") {
          if (!item.amount || item.amount <= 0) {
            throw new AppError({
              httpCode: 400,
              description: "Tip amount must be greater than 0",
            });
          }
          resolvedItems.push({
            type: "tip",
            quantity: 1,
            amount: item.amount,
            message: item.message,
          });
        }
      }

      const totalAmount = resolvedItems.reduce((sum, i) => sum + i.amount, 0);
      if (totalAmount <= 0) {
        throw new AppError({
          httpCode: 400,
          description: "Total payment amount must be greater than 0",
        });
      }

      const result = await initiatePayment({
        readerId,
        artistId,
        items: resolvedItems,
        userEmail: loggedInUser?.email ?? email ?? "",
        userId: loggedInUser ? String(loggedInUser.id) : undefined,
        clientId,
        successUrl,
        stripeAccountId: resolvedStripeAccountId,
        requiresShipping,
        allowedCountries,
      });

      if (hosted && mirloClient && "clientSecret" in result) {
        const redirectUrl = buildCheckoutRedirectUrl(
          mirloClient.applicationUrl,
          "checkout",
          new URLSearchParams({
            intentId: result.paymentIntentId,
            stripeAccountId: result.stripeAccountId,
          })
        );
        return res.status(200).json({ redirectUrl });
      }

      if ("clientSecret" in result && requiresShipping) {
        return res
          .status(200)
          .json({ ...result, requiresShipping, allowedCountries });
      }

      res.status(200).json(result);
    } catch (e) {
      next(e);
    }
  }

  POST.apiDoc = {
    summary: "Initiate a purchase",
    description: "Unified purchase endpoint for all item types and channels. ",
    parameters: [
      {
        in: "body",
        name: "body",
        required: true,
        schema: { $ref: "#/definitions/PurchaseRequest" },
      },
    ],
    responses: {
      200: {
        description: "Purchase initiated",
        schema: {
          type: "object",
          properties: {
            paymentIntentId: { type: "string" },
            setupIntentId: { type: "string" },
            clientSecret: { type: "string" },
            stripeAccountId: { type: "string" },
            redirectUrl: { type: "string" },
            success: { type: "boolean" },
          },
        },
      },
      400: { description: "Missing or invalid parameters" },
      401: {
        description: "A readerId was supplied without an authenticated user",
      },
      404: { description: "Artist, item, or subscription tier not found" },
      default: {
        description: "An error occurred",
        schema: { additionalProperties: true },
      },
    },
  };

  return operations;
}
