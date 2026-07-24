import { getHighContrastColors } from "./colors";

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
  options?: { highContrast?: boolean; prefersDark?: boolean }
): ArtistColors {
  if (options?.highContrast) {
    return getHighContrastColors(options.prefersDark ?? false);
  }
  return normalizeArtistColors(raw);
}
