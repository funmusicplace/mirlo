import { HIGH_CONTRAST_LIGHT } from "./colors";

export type HighContrastPreference = "system" | "on" | "off";

const isDefined = (value?: string) => Boolean(value && value !== "");

export function getEffectiveHighContrast(
  preference: HighContrastPreference | undefined,
  prefersContrastMore: boolean
): boolean {
  switch (preference ?? "system") {
    case "on":
      return true;
    case "off":
      return false;
    case "system":
    default:
      return prefersContrastMore;
  }
}

/** Whether to apply HC palettes for a specific artist for this user. */
export function shouldApplyArtistHighContrast(options: {
  preference: HighContrastPreference | undefined;
  prefersContrastMore: boolean;
  artistId?: number;
  highContrastOffArtistIds?: number[];
}): boolean {
  if (
    !getEffectiveHighContrast(options.preference, options.prefersContrastMore)
  ) {
    return false;
  }
  if (
    options.artistId != null &&
    options.highContrastOffArtistIds?.includes(options.artistId)
  ) {
    return false;
  }
  return true;
}

export function normalizeArtistColors(raw?: ArtistColors): ArtistColors {
  const c = raw ?? {};
  const pick = (...vals: Array<string | undefined>) =>
    vals.find(isDefined) ?? undefined;
  return {
    button: pick(c.button),
    buttonText: pick(c.buttonText),
    background: pick(c.background),
    text: pick(c.text),
    secondaryText: pick(c.secondaryText, c.text),
  };
}

export function resolveArtistColors(
  raw?: ArtistColors,
  options?: { highContrast?: boolean; }
): ArtistColors {
  if (options?.highContrast) {
    return HIGH_CONTRAST_LIGHT;
  }
  return normalizeArtistColors(raw);
}
