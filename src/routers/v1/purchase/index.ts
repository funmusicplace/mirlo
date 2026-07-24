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
import {
  initiatePayment,
  initiateSubscription,
  type ResolvedItem,
} from "../../../utils/payments/purchase";
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
  | { type: "subscription"; tierId: number; amount?: number };

type PostBody = {
  readerId?: string;
  artistId: number;
  items: PurchaseItem[];
  email?: string;
  /**
   * When true, an online paid purchase returns a `redirectUrl` to Mirlo's
   * hosted checkout page instead of a raw `clientSecret`. Lets external API
   * consumers (e.g. a WordPress plugin) integrate with a single redirect,
   * the way the deleted per-resource endpoints used to behave.
   */
  hosted?: boolean;
  /**
   * Where the hosted checkout page sends the buyer after payment. Must share
   * an origin with the calling client's registered application URL / allowed
   * CORS origins (or Mirlo's own frontend). Defaults to Mirlo's post-purchase
   * page when omitted.
   */
  successUrl?: string;
};

// trackGroup and track purchases resolve identically (payee, follow-on-buy,
// user discount, free-vs-paid) — only the Prisma fetch and free-purchase
// handler differ per type, so callers do those and hand the shared shape in.
type DigitalReleaseArtist = Parameters<typeof subscribeUserToArtist>[0] &
  Parameters<typeof resolvePayee>[0]["artist"] & { urlSlug: string | null };

const resolveDigitalPurchaseItem = async <T extends "trackGroup" | "track">({
  type,
  id,
  loggedInUser,
  readerId,
  price,
  message,
  minPrice,
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
  artist: DigitalReleaseArtist;
  paymentToUser?: { stripeAccountId: string | null } | null;
  /** The release (trackGroup) the download link points at — same for both a trackGroup and one of its tracks. */
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

  // Free online purchase — handle immediately, no PaymentIntent needed
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
    },
  };
};

/**
 * Resolves a merch cart item — options, stock, buyer price, shipping cost —
 * the merch counterpart to resolveDigitalPurchaseItem above for trackGroup/track.
 * Also surfaces `requiresShipping`/`allowedCountries` for the frontend's
 * address collector.
 */
const resolveMerchPurchaseItem = (
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
    },
    requiresShipping,
    allowedCountries,
  };
};

/**
 * Guards the hosted checkout against being used as an open redirect: the
 * caller-supplied `successUrl` must share an origin with Mirlo's own frontend
 * or with the authenticated client's registered application/CORS origins.
 */
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

      // Dispatching to a physical reader is a merchant action, not a buyer
      // action: anyone who knows a reader id could otherwise hijack the
      // artist's terminal (push their own charges/subscription sign-ups onto
      // it, or grief it with junk prompts). Client API keys don't help here —
      // the frontend's key ships in the public JS bundle.
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

      const hasSubscription = items.some((i) => i.type === "subscription");
      if (hasSubscription && items.length > 1) {
        throw new AppError({
          httpCode: 400,
          description: "Subscription must be the only item in the cart",
        });
      }

      if (hasSubscription) {
        if (!readerId) {
          throw new AppError({
            httpCode: 400,
            description:
              "Online subscriptions not yet supported via this endpoint",
          });
        }

        const subItem = items[0] as {
          type: "subscription";
          tierId: number;
          amount?: number;
        };

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

      const resolvedItems: ResolvedItem[] = [];
      let resolvedStripeAccountId: string | undefined;
      let requiresShipping = false;
      let allowedCountries: string[] | undefined;

      for (const item of items) {
        if (item.type === "trackGroup") {
          const tg = await prisma.trackGroup.findFirst({
            where: { id: item.id, artist: { id: artistId } },
            include: {
              paymentToUser: { select: { stripeAccountId: true } },
              artist: {
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
            artist: tg.artist,
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
            where: { id: item.id, trackGroup: { artistId } },
            include: {
              trackGroup: {
                include: {
                  artist: {
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
            artist: track.trackGroup.artist,
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
                artistId,
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
      });

      // Hosted checkout: hand external integrators a single redirect to Mirlo's
      // own pay page (which loads the Payment Element) instead of a clientSecret
      // they would have to drive Stripe.js with themselves.
      if (hosted && mirloClient && "clientSecret" in result) {
        const redirectUrl = buildCheckoutRedirectUrl(
          mirloClient.applicationUrl,
          "checkout",
          new URLSearchParams({
            paymentIntentId: result.paymentIntentId,
            stripeAccountId: result.stripeAccountId,
          })
        );
        return res.status(200).json({ redirectUrl });
      }

      // Physical merch needs a mailing address collected in the Payment
      // Element step, restricted to the countries this item can actually
      // ship to.
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
      "Provide `readerId` to dispatch to a Stripe Terminal reader (in-person) — " +
      "this requires a logged-in user with edit rights on the artist; " +
      "omit it for an online PaymentIntent that the frontend completes with Stripe.js. " +
      "Returns `paymentIntentId` (terminal — poll GET /v1/purchase/:id), " +
      "`setupIntentId` (terminal subscription — poll GET /v1/purchase/:id), " +
      "`clientSecret` + `stripeAccountId` (online paid — load Stripe.js for that " +
      "connected account and pass the secret to the Payment Element), " +
      "or `redirectUrl` (online free trackGroup). " +
      "Pass `hosted: true` to receive a `redirectUrl` to Mirlo's hosted checkout " +
      "page for an online paid purchase instead of a `clientSecret` — intended " +
      "for external API consumers that integrate with a single redirect.",
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
