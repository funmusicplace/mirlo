import prisma from "@mirlo/prisma";
import { NextFunction, Request, Response } from "express";
import { uniq } from "lodash";

import {
  profileEditableByUser,
  userLoggedInWithoutRedirect,
} from "../../../auth/passport";
import { subscribeUserToProfile } from "../../../utils/artist";
import { calculateCatalogueFloorPrice } from "../../../utils/catalogue";
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
import { createCheckout, findCheckout } from "../../../utils/payments/checkout";
import { resolvePayee } from "../../../utils/payments/payee";
import {
  getPaymentProcessor,
  type DeferredQuote,
  type ShippingAddress,
} from "../../../utils/payments/PaymentProcessor";
import { initiateFundraiserPledge } from "../../../utils/payments/pledge";
import {
  initiatePayment,
  resolveProfilePaymentContext,
  type ResolvedItem,
} from "../../../utils/payments/purchase";
import {
  initiateOnlineSubscription,
  initiateSubscription,
} from "../../../utils/payments/subscription";
import { determinePrice } from "../../../utils/purchasing";
import { findUserDiscountPercentsForProfile } from "../../../utils/user";

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
  | { type: "catalogue"; price?: string; message?: string }
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
  deferred?: boolean;
  checkoutId?: string;
  shippingAddress?: ShippingAddress;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type DigitalReleaseProfile = Parameters<typeof subscribeUserToProfile>[0] &
  Parameters<typeof resolvePayee>[0]["profile"] & { urlSlug: string | null };

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
  profile,
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
  profile: DigitalReleaseProfile;
  paymentToUser?: { stripeAccountId: string | null } | null;
  releaseUrlSlug: string | null;
  releaseId: number;
  handleFreePurchase: () => Promise<unknown>;
}): Promise<
  | { kind: "free"; redirectUrl: string }
  | { kind: "paid"; stripeAccountId?: string; item: ResolvedItem }
> => {
  const payee = resolvePayee({
    profile,
    releasePaymentToUser: paymentToUser,
  }) as {
    stripeAccountId: string | null;
  };
  const stripeAccountId = payee.stripeAccountId ?? undefined;

  if (loggedInUser) {
    await subscribeUserToProfile(profile, loggedInUser);
  }

  let discountPercent = 0;
  if (loggedInUser) {
    const discounts = await findUserDiscountPercentsForProfile(
      loggedInUser.id,
      profile.id
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
      redirectUrl: `/${profile.urlSlug ?? profile.id}/release/${
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
    const body = req.body as PostBody;
    const loggedInUser = req.user;

    try {
      // A checkout opened earlier holds the cart; the browser can only add
      // the buyer's email and address.
      const checkout = body.checkoutId
        ? await findCheckout(body.checkoutId)
        : undefined;

      // Its link was opened again after the buyer paid.
      if (checkout?.completedAt) {
        return res.status(200).json({ success: true });
      }

      const readerId = checkout ? undefined : body.readerId;
      const hosted = checkout ? false : body.hosted;
      const profileId = checkout ? checkout.profileId : body.artistId;
      const items = (checkout ? checkout.items : body.items) as PurchaseItem[];
      const email = checkout?.email ?? body.email;
      const successUrl = checkout
        ? (checkout.successUrl ?? undefined)
        : body.successUrl;
      const clientId = checkout
        ? (checkout.clientId ?? undefined)
        : req.client?.id;
      const deferred = !!body.deferred || !!hosted;
      const { shippingAddress } = body;

      // Paying again (e.g. after a declined card) confirms the same intent,
      // unless it brings a shipping address: a SetupIntent only takes one
      // when it's created, and the buyer may have changed it.
      if (
        checkout?.stripeId &&
        checkout.stripeAccountId &&
        !deferred &&
        !shippingAddress
      ) {
        const { clientSecret } = await getPaymentProcessor().getStatus({
          id: checkout.stripeId,
          accountId: checkout.stripeAccountId,
        });
        return res
          .status(200)
          .json({ clientSecret, stripeAccountId: checkout.stripeAccountId });
      }

      if (!profileId || !items?.length) {
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
        await profileEditableByUser(profileId, loggedInUser);
      }

      if (email && !loggedInUser && !EMAIL_REGEX.test(email)) {
        throw new AppError({
          httpCode: 400,
          description: "email is not a valid email address",
        });
      }

      const mirloClient = successUrl || hosted ? await getClient() : null;

      // A checkout's successUrl was checked when it was opened.
      if (successUrl && mirloClient && !checkout) {
        assertAllowedSuccessUrl(
          successUrl,
          mirloClient.applicationUrl,
          req.client ?? undefined
        );
      }

      const respondDeferred = async (quote: DeferredQuote) => {
        const checkoutId =
          checkout?.id ??
          (
            await createCheckout({
              profileId,
              items,
              email,
              successUrl,
              clientId,
            })
          ).id;

        if (hosted && mirloClient) {
          const redirectUrl = buildCheckoutRedirectUrl(
            mirloClient.applicationUrl,
            "checkout",
            new URLSearchParams({ checkoutId })
          );
          return res.status(200).json({ redirectUrl });
        }

        const profile = await prisma.profile.findFirst({
          where: { id: profileId },
          select: { name: true },
        });
        return res.status(200).json({
          deferred: {
            ...quote,
            checkoutId,
            buyerEmailKnown: !!(loggedInUser || email),
            artistName: profile?.name ?? null,
            successUrl: successUrl ?? null,
          },
        });
      };

      // So a retry confirms this intent instead of creating another.
      const recordIntent = async (intent: {
        stripeId: string;
        stripeAccountId: string;
      }) => {
        if (checkout) {
          await prisma.checkout.update({
            where: { id: checkout.id },
            data: intent,
          });
        }
      };

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
            profileId,
            tierId: subItem.tierId,
            amount: subItem.amount,
            userEmail: loggedInUser?.email ?? email ?? "",
            userId: loggedInUser ? String(loggedInUser.id) : undefined,
          });

          return res.status(200).json({ setupIntentId });
        }

        const result = await initiateOnlineSubscription({
          profileId,
          tierId: subItem.tierId,
          amount: subItem.amount,
          userEmail: loggedInUser?.email ?? email ?? "",
          userId: loggedInUser?.id,
          userName: subItem.userName,
          successUrl,
          deferred,
          shippingAddress,
          checkoutId: checkout?.id,
          // Opening a checkout link mustn't switch a subscriber's tier.
          switchImmediately: !checkout,
        });

        if ("deferred" in result) {
          return respondDeferred(result.deferred);
        }
        if ("setupIntentId" in result) {
          await recordIntent({
            stripeId: result.setupIntentId,
            stripeAccountId: result.stripeAccountId,
          });
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
          profileId,
          fundraiserId: pledgeItem.fundraiserId,
          trackGroupId: pledgeItem.trackGroupId,
          price: pledgeItem.price,
          message: pledgeItem.message,
          userEmail: loggedInUser?.email ?? email ?? "",
          userId: loggedInUser?.id,
          successUrl,
          deferred,
          checkoutId: checkout?.id,
        });

        if ("deferred" in result) {
          return respondDeferred(result.deferred);
        }
        await recordIntent({
          stripeId: result.setupIntentId,
          stripeAccountId: result.stripeAccountId,
        });

        return res.status(200).json(result);
      }

      const resolvedItems: ResolvedItem[] = [];
      // Every item's payee account. A PaymentIntent is a direct charge on one
      // connected account, so the cart can only pay one of them.
      const payeeAccountIds: (string | null)[] = [];
      let profilePayeeAccountId: string | null | undefined;
      const resolveProfilePayeeAccountId = async () => {
        if (profilePayeeAccountId === undefined) {
          const profile = await prisma.profile.findFirst({
            where: { id: profileId },
            include: {
              user: { select: { stripeAccountId: true } },
              paymentToUser: { select: { stripeAccountId: true } },
            },
          });
          profilePayeeAccountId = profile
            ? (resolvePayee({ profile }).stripeAccountId ?? null)
            : null;
        }
        return profilePayeeAccountId;
      };
      let requiresShipping = false;
      let allowedCountries: string[] | undefined;

      for (const item of items) {
        if (item.type === "trackGroup") {
          const tg = await prisma.trackGroup.findFirst({
            where: { id: item.id, profile: { id: profileId } },
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
            profile: tg.profile,
            paymentToUser: tg.paymentToUser,
            releaseUrlSlug: tg.urlSlug,
            releaseId: tg.id,
            handleFreePurchase: () =>
              handleTrackGroupPurchase(loggedInUser!.id, tg.id),
          });

          if (result.kind === "free") {
            return res.status(200).json({ redirectUrl: result.redirectUrl });
          }
          payeeAccountIds.push(result.stripeAccountId ?? null);
          resolvedItems.push(result.item);
        } else if (item.type === "track") {
          const track = await prisma.track.findFirst({
            where: { id: item.id, trackGroup: { profileId } },
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
            profile: track.trackGroup.profile,
            paymentToUser: track.trackGroup.paymentToUser,
            releaseUrlSlug: track.trackGroup.urlSlug,
            releaseId: track.trackGroup.id,
            handleFreePurchase: () =>
              handleTrackPurchase(loggedInUser!.id, track.id),
          });

          if (result.kind === "free") {
            return res.status(200).json({ redirectUrl: result.redirectUrl });
          }
          payeeAccountIds.push(result.stripeAccountId ?? null);
          resolvedItems.push(result.item);
        } else if (item.type === "merch") {
          const merch: MerchWithOptionsAndShipping | null =
            await prisma.merch.findFirst({
              where: {
                id: item.id,
                profileId,
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
          payeeAccountIds.push(await resolveProfilePayeeAccountId());
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
          payeeAccountIds.push(await resolveProfilePayeeAccountId());
          resolvedItems.push({
            type: "tip",
            quantity: 1,
            amount: item.amount,
            message: item.message,
          });
        } else if (item.type === "catalogue") {
          const profile = await prisma.profile.findFirst({
            where: { id: profileId },
            include: { user: true, subscriptionTiers: true },
          });
          if (!profile) {
            throw new AppError({
              httpCode: 404,
              description: `Artist ${profileId} not found`,
            });
          }

          if (!profile.purchaseEntireCatalogEnabled) {
            throw new AppError({
              httpCode: 400,
              description:
                "This artist isn't selling their catalogue as a bundle",
            });
          }

          if (loggedInUser) {
            await subscribeUserToProfile(profile, loggedInUser);
          }

          const floorPrice = await calculateCatalogueFloorPrice(profile);
          const { isPriceZero, priceNumber } = determinePrice(
            item.price,
            floorPrice
          );
          if (isPriceZero) {
            throw new AppError({
              httpCode: 400,
              description: "You can't purchase a catalogue for free",
            });
          }

          payeeAccountIds.push(await resolveProfilePayeeAccountId());
          resolvedItems.push({
            type: "catalogue",
            quantity: 1,
            amount: priceNumber,
            message: item.message,
          });
        }
      }

      const cartAccountIds = uniq(payeeAccountIds);
      if (cartAccountIds.length > 1) {
        throw new AppError({
          httpCode: 400,
          description:
            "Items in one cart must all be paid to the same account; buy them separately",
        });
      }
      const [payeeAccountId] = cartAccountIds;
      if (!payeeAccountId) {
        throw new AppError({
          httpCode: 400,
          description: "Artist is not set up with a payment processor",
        });
      }

      const totalAmount = resolvedItems.reduce((sum, i) => sum + i.amount, 0);
      if (totalAmount <= 0) {
        throw new AppError({
          httpCode: 400,
          description: "Total payment amount must be greater than 0",
        });
      }

      if (deferred && !readerId) {
        const { currency } = await resolveProfilePaymentContext(
          profileId,
          payeeAccountId
        );
        return respondDeferred({
          mode: "payment",
          amount: totalAmount,
          currency,
          stripeAccountId: payeeAccountId,
          requiresShipping,
          allowedCountries,
        });
      }

      const result = await initiatePayment({
        readerId,
        profileId,
        items: resolvedItems,
        userEmail: loggedInUser?.email ?? email ?? "",
        userId: loggedInUser ? String(loggedInUser.id) : undefined,
        clientId,
        successUrl,
        stripeAccountId: payeeAccountId,
        requiresShipping,
        allowedCountries,
        checkoutId: checkout?.id,
      });

      if ("clientSecret" in result) {
        await recordIntent({
          stripeId: result.paymentIntentId,
          stripeAccountId: result.stripeAccountId,
        });
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
    description:
      "Unified purchase endpoint for all item types and channels. " +
      "A checkout makes two calls: one with `deferred: true` when it opens, " +
      "which saves the cart as a checkout and returns what Stripe Elements " +
      "needs, and `{ checkoutId, email?, shippingAddress? }` when the " +
      "buyer pays, which creates the intent. Pass `email` on that second " +
      "call when no one is logged in.",
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
            deferred: {
              type: "object",
              description:
                "Returned for `deferred: true`. Initialise Stripe Elements with " +
                "{ mode, amount, currency } on stripeAccountId's account.",
              properties: {
                mode: { type: "string", enum: ["payment", "setup"] },
                amount: {
                  type: "number",
                  description: "Smallest currency unit. Payment mode only.",
                },
                currency: { type: "string" },
                stripeAccountId: { type: "string" },
                requiresShipping: { type: "boolean" },
                allowedCountries: { type: "array", items: { type: "string" } },
                checkoutId: {
                  type: "string",
                  description: "The checkout to pay for.",
                },
                buyerEmailKnown: {
                  type: "boolean",
                  description:
                    "False when the checkout must collect the buyer's email.",
                },
                artistName: { type: "string" },
                successUrl: { type: "string" },
              },
            },
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
