import prisma from "@mirlo/prisma";
import {
  Merch,
  MerchImage,
  MerchOption,
  MerchOptionType,
} from "@mirlo/prisma/client";

import logger from "../logger";

import { addSizesToImage } from "./artist";
import { deleteDownloadableContent } from "./content";
import countryCodesCurrencies from "./country-codes-currencies";
import { AppError } from "./error";
import { finalMerchImageBucket, removeObjectsFromBucket } from "./minio";

export const deleteMerchCover = async (merchId: string) => {
  const image = await prisma.merchImage.findFirst({
    where: {
      merchId,
    },
  });

  if (image) {
    try {
      await prisma.merchImage.delete({
        where: {
          id: merchId,
        },
      });
    } catch (e) {
      logger.error(`Error deleting merch cover`);
      console.error(e);
    }

    try {
      removeObjectsFromBucket(finalMerchImageBucket, image.id);
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
export const deleteMerch = async (merchId: string) => {
  await deleteMerchCover(merchId);

  const downloadableContents = await prisma.merchDownloadableContent.findMany({
    where: {
      merchId,
    },
  });

  await Promise.all(
    downloadableContents.map((dc) =>
      deleteDownloadableContent(dc.downloadableContentId)
    )
  );

  await prisma.merch.delete({
    where: {
      id: merchId,
    },
  });
};

export const processSingleMerch = (
  merch: Merch & { images?: MerchImage[] } & {
    artist?: { user?: { currency?: string | null } | null } | null;
    downloadableContent?: {
      downloadableContent: Record<string, unknown>;
      downloadableContentId: string;
    }[];
  },
  options?: { fallbackCurrency?: string }
) => ({
  ...merch,
  currency: merch.artist?.user?.currency ?? options?.fallbackCurrency ?? "usd",
  downloadableContent: merch.downloadableContent?.map((dc) => ({
    ...dc,
    downloadableContent: {
      ...dc.downloadableContent,
      downloadUrl:
        process.env.API_DOMAIN +
        `/v1/downloadableContent/${dc.downloadableContentId}`,
    },
  })),
  images: merch.images?.map((t) => addSizesToImage(finalMerchImageBucket, t)),
});

// --- Order-resolution helpers for merch purchases ---
//
// Used by both purchase flows: POST /v1/purchase calls these directly, and
// src/utils/stripe/sessions.ts's determineShipping wraps calculateMerchShippingCost
// in Stripe's shipping_rate_data shape for the legacy Checkout Session endpoint.

const stripeBannedDestinations =
  "AS, CX, CC, CU, HM, IR, KP, MH, FM, NF, MP, PW, SD, SY, UM, VI".split(", ");

const SCHENGEN_COUNTRY_CODES = [
  "AT",
  "BE",
  "BG",
  "CZ",
  "DE",
  "EE",
  "ES",
  "FI",
  "GR",
  "HR",
  "HU",
  "IT",
  "LT",
  "LU",
  "LV",
  "MT",
  "NL",
  "PL",
  "PT",
  "RO",
  "SE",
  "SI",
  "SK",
];

export type MerchWithOptionsAndShipping = Merch & {
  optionTypes: (MerchOptionType & { options: MerchOption[] })[];
  shippingDestinations: {
    id: string;
    destinationCountry: string | null;
    costUnit: number;
    costExtraUnit: number;
  }[];
};

/**
 * Validates the buyer's selected option ids against the merch's own option
 * types and returns the resolved options plus their total per-unit price
 * add-on. Throws 400 on any id that doesn't belong to this merch item.
 * Returns the full option objects, not just ids, since callers such as
 * `checkMerchStock` need the objects themselves.
 */
export const resolveMerchOptionIds = (
  merch: MerchWithOptionsAndShipping,
  merchOptionIds?: string[]
): { options: MerchOption[]; additionalPricePerUnit: number } => {
  if (!merchOptionIds || merchOptionIds.length === 0) {
    return { options: [], additionalPricePerUnit: 0 };
  }

  const allOptions = merch.optionTypes.flatMap((ot) => ot.options);
  const options = merchOptionIds.map((id) => {
    const option = allOptions.find((o) => o.id === id);
    if (!option) {
      throw new AppError({
        httpCode: 400,
        description: `Option ${id} is not valid for this merch item`,
      });
    }
    return option;
  });

  return {
    options,
    additionalPricePerUnit: options.reduce(
      (sum, o) => sum + (o.additionalPrice ?? 0),
      0
    ),
  };
};

/**
 * Resolves the shipping cost (in cents, for the whole order), the set of
 * country codes valid for that destination (doubles as the `allowedCountries`
 * list for the frontend's address collector), and the matched destination's
 * own country (for display purposes).
 *
 * Assumes a non-empty `shippingDestinations` and a real `shippingDestinationId`
 * — callers must skip this entirely for merch items with no shipping
 * destinations at all (digital items).
 */
export const calculateMerchShippingCost = (
  shippingDestinations: MerchWithOptionsAndShipping["shippingDestinations"],
  shippingDestinationId: string,
  quantity: number
): {
  costCents: number;
  allowedCountries: string[];
  destinationCountry: string | null;
} => {
  const isShippingToSchengen = SCHENGEN_COUNTRY_CODES.includes(
    shippingDestinationId.toUpperCase()
  );

  const euCosts = shippingDestinations.find(
    (s) => s.destinationCountry === "EU"
  );

  const destination = isShippingToSchengen
    ? euCosts && { ...euCosts, destinationCountry: shippingDestinationId }
    : shippingDestinations.find((s) => s.id === shippingDestinationId);

  if (!destination) {
    throw new AppError({
      httpCode: 400,
      description:
        "Supplied destination isn't a valid destination for the seller",
    });
  }

  let allowedCountries = [destination.destinationCountry as string];

  if (!destination.destinationCountry) {
    const specificShippingCosts = shippingDestinations.filter(
      (d) => d.destinationCountry !== ""
    );

    allowedCountries = countryCodesCurrencies
      .map((country) => {
        const inSpecific = specificShippingCosts.find(
          (d) => d.destinationCountry === country.countryCode
        );
        const banned = stripeBannedDestinations.includes(country.countryCode);
        if (banned || inSpecific) return null;
        return country.countryCode;
      })
      .filter((country): country is string => !!country);
  }

  const costCents =
    (destination.costUnit ?? 0) +
    (quantity > 1 ? (quantity - 1) * (destination.costExtraUnit ?? 0) : 0);

  return {
    costCents,
    allowedCountries,
    destinationCountry: destination.destinationCountry ?? null,
  };
};

/**
 * Throws 400 if the requested quantity exceeds the merch item's (or any
 * selected option's) remaining stock. Takes the resolved options from
 * `resolveMerchOptionIds` rather than option ids.
 */
export const checkMerchStock = (
  merch: MerchWithOptionsAndShipping,
  options: MerchOption[],
  quantity: number
) => {
  if (merch.quantityRemaining !== null && quantity > merch.quantityRemaining) {
    throw new AppError({
      httpCode: 400,
      description: "Not enough stock remaining for this merch item",
    });
  }

  const outOfStock = options.find(
    (o) => o.quantityRemaining !== null && quantity > o.quantityRemaining
  );

  if (outOfStock) {
    throw new AppError({
      httpCode: 400,
      description: `Not enough stock remaining for option ${outOfStock.name}`,
    });
  }
};

/**
 * Decrements stock after a successful purchase — option stock if any options
 * were selected, otherwise the merch item's own stock. Uses Prisma's atomic
 * `decrement` so each target gets a single update, with no read/write race.
 */
export const decrementMerchStock = async (
  merchId: string,
  optionIds: string[],
  quantity: number
) => {
  if (optionIds.length > 0) {
    await prisma.merchOption.updateMany({
      where: { id: { in: optionIds }, quantityRemaining: { not: null } },
      data: { quantityRemaining: { decrement: quantity } },
    });
    return;
  }

  await prisma.merch.updateMany({
    where: { id: merchId, quantityRemaining: { not: null } },
    data: { quantityRemaining: { decrement: quantity } },
  });
};

export default {
  single: processSingleMerch,
};
