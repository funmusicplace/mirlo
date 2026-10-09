import prisma from "@mirlo/prisma";
import {
  Image,
  Merch,
  MerchImage,
  MerchOption,
  MerchOptionType,
  Prisma,
} from "@mirlo/prisma/client";

import logger from "../logger";

import { deleteDownloadableContent } from "./content";
import countryCodesCurrencies from "./country-codes-currencies";
import { AppError } from "./error";
import { generateFullStaticImageUrl } from "./images";
import {
  finalImageBucket,
  finalMerchImageBucket,
  removeImagesByType,
} from "./minio";

export const merchImagesInclude = {
  include: { image: true },
  orderBy: { position: "asc" },
} satisfies Prisma.Merch$imagesArgs;

export type MerchImageWithImage = MerchImage & { image?: Image | null };

export const resolveMerchImage = (merchImage: MerchImageWithImage) =>
  merchImage.image
    ? {
        image: merchImage.image,
        imageType: "image" as const,
        bucket: finalImageBucket,
      }
    : {
        image: merchImage,
        imageType: "merch" as const,
        bucket: finalMerchImageBucket,
      };

export const merchImageUrl = (
  merchImage: MerchImageWithImage | undefined,
  size: number
) => {
  if (!merchImage) {
    return undefined;
  }
  const { image, bucket } = resolveMerchImage(merchImage);
  const variant = image.url.find((u) => u.endsWith(`-x${size}`));
  return variant ? generateFullStaticImageUrl(variant, bucket) : undefined;
};

export const deleteMerchImage = async (merchImage: MerchImageWithImage) => {
  const { imageType } = resolveMerchImage(merchImage);
  const storedId = merchImage.imageId ?? merchImage.id;

  await prisma.merchImage.delete({ where: { id: merchImage.id } });
  if (merchImage.imageId) {
    await prisma.image.delete({ where: { id: merchImage.imageId } });
  }

  try {
    await removeImagesByType(imageType, storedId);
  } catch (e) {
    logger.info(`No stored objects for merch image ${storedId}, that's okay`);
  }
};

export const deleteMerchImages = async (merchId: string) => {
  const images = await prisma.merchImage.findMany({
    where: { merchId },
    include: { image: true },
  });

  for (const image of images) {
    try {
      await deleteMerchImage(image);
    } catch (e) {
      logger.error(`Error deleting merch image ${image.id}`);
      console.error(e);
    }
  }
};

export const deleteMerch = async (merchId: string) => {
  await deleteMerchImages(merchId);

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

// --- Order-resolution helpers for merch purchases ---

const stripeBannedDestinations =
  "AS, CX, CC, CU, HM, IR, KP, MH, FM, NF, MP, PW, SD, SY, UM, VI".split(", ");

export const getStripeShippableCountries = (exclude: string[] = []) =>
  countryCodesCurrencies
    .map((country) => country.countryCode)
    .filter(
      (code) =>
        !stripeBannedDestinations.includes(code) && !exclude.includes(code)
    );

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
 * add-on.
 */
export const resolveMerchOptionIds = (
  merch: MerchWithOptionsAndShipping,
  merchOptionIds?: string[]
): { options: MerchOption[]; additionalPricePerUnit: number } => {
  const allOptions = merch.optionTypes.flatMap((ot) => ot.options);
  const options = (merchOptionIds ?? []).filter(Boolean).map((id) => {
    const option = allOptions.find((o) => o.id === id);
    if (!option) {
      throw new AppError({
        httpCode: 400,
        description: `Option ${id} is not valid for this merch item`,
      });
    }
    return option;
  });

  const unanswered = merch.optionTypes.find(
    (ot) =>
      ot.required &&
      ot.options.length > 0 &&
      !ot.options.some((o) => options.some((chosen) => chosen.id === o.id))
  );

  if (unanswered) {
    throw new AppError({
      httpCode: 400,
      description: `You have to choose a ${unanswered.optionName} for this merch item`,
    });
  }

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

    allowedCountries = getStripeShippableCountries(
      specificShippingCosts.map((d) => d.destinationCountry as string)
    );
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
