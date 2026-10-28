import prisma from "@mirlo/prisma";

import { AppError } from "./error";
import { clearImageSlot } from "./pendingImage";

export const MAX_SPLASH_TITLE_LENGTH = 200;
export const MAX_SPLASH_SUBTITLE_LENGTH = 1000;

export const SPLASH_TEXT_POSITIONS = ["left", "center", "right"] as const;

export type SplashTextPosition = (typeof SPLASH_TEXT_POSITIONS)[number];

export const isSplashTextPosition = (
  value: unknown
): value is SplashTextPosition =>
  SPLASH_TEXT_POSITIONS.includes(value as SplashTextPosition);

export const validateSplashCustomization = (customization?: {
  splashTitle?: unknown;
  splashSubtitle?: unknown;
  showCustomSplash?: unknown;
  splashTextPosition?: unknown;
}) => {
  for (const [value, maxLength] of [
    [customization?.splashTitle, MAX_SPLASH_TITLE_LENGTH],
    [customization?.splashSubtitle, MAX_SPLASH_SUBTITLE_LENGTH],
  ] as const) {
    if (value !== undefined && typeof value !== "string") {
      throw new AppError({
        httpCode: 400,
        description: "The splash screen texts must be strings",
      });
    }
    if (typeof value === "string" && value.trim().length > maxLength) {
      throw new AppError({
        httpCode: 400,
        description: `The splash screen texts must be ${maxLength} characters or fewer`,
      });
    }
  }
  const showCustomSplash = customization?.showCustomSplash;
  if (showCustomSplash !== undefined && typeof showCustomSplash !== "boolean") {
    throw new AppError({
      httpCode: 400,
      description: "The custom splash screen setting must be true or false",
    });
  }
  const textPosition = customization?.splashTextPosition;
  if (textPosition !== undefined && !isSplashTextPosition(textPosition)) {
    throw new AppError({
      httpCode: 400,
      description: "The splash text position must be left, center or right",
    });
  }
};

export const findSettingsId = async () =>
  (await prisma.settings.findFirstOrThrow({ select: { id: true } })).id;

export const deleteSplashImage = async () =>
  clearImageSlot("SPLASH", await findSettingsId());
