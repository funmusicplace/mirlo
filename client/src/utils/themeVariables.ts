import { getBrightness, isLight } from "./colors";

type Rgb = readonly [number, number, number];

type TintOverlay = {
  color: Rgb;
  alphas: readonly [tint: number, tintX: number, tintXX: number];
};

type ButtonTintOverlay = {
  color: Rgb;
  alphas: readonly [tint: number, tintX: number];
};

export type ThemeProfile = {
  baseVariablePrefix: "--mi-" | "--mi-instance-";
  tint: { light: TintOverlay; dark: TintOverlay };
  buttonTint?: { light: ButtonTintOverlay; dark: ButtonTintOverlay };
  chipBrightness?: { light: string; dark: string };
  contrastColorFromBackground: boolean;
  fixedColorsFromBackground: boolean;
};

const BLACK: Rgb = [0, 0, 0];
const WHITE: Rgb = [255, 255, 255];
const SITE_DARKEN: Rgb = [50, 0, 0];
const FIXED_SCHEME_BRIGHTNESS_THRESHOLD = 100;

export const SITE_THEME_PROFILE: ThemeProfile = {
  baseVariablePrefix: "--mi-instance-",
  tint: {
    light: { color: SITE_DARKEN, alphas: [0.03, 0.2, 0.2] },
    dark: { color: WHITE, alphas: [0.08, 0.18, 0.35] },
  },
  contrastColorFromBackground: false,
  fixedColorsFromBackground: false,
};

export const ARTIST_THEME_PROFILE: ThemeProfile = {
  baseVariablePrefix: "--mi-",
  tint: {
    light: { color: BLACK, alphas: [0.05, 0.15, 0.3] },
    dark: { color: WHITE, alphas: [0.08, 0.18, 0.35] },
  },
  buttonTint: {
    light: { color: BLACK, alphas: [0.05, 0.2] },
    dark: { color: WHITE, alphas: [0.06, 0.24] },
  },
  chipBrightness: { light: ".9", dark: "1.3" },
  contrastColorFromBackground: true,
  fixedColorsFromBackground: true,
};

export const isDefined = (value?: string) => Boolean(value && value !== "");

const rgba = ([r, g, b]: Rgb, alpha: number) =>
  `rgba(${r}, ${g}, ${b}, ${alpha})`;

const baseVariables = (
  colors: ArtistColors,
  profile: ThemeProfile
): Record<string, string> => {
  const map: Record<string, string> = {};
  for (const [slot, value] of Object.entries(colors)) {
    if (!isDefined(value)) continue;
    const cssVar = `${profile.baseVariablePrefix}${slot.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase())}-color`;
    map[cssVar] = value as string;
  }
  return map;
};

const tintVariables = (
  surface: string | undefined,
  profile: ThemeProfile
): Record<string, string> => {
  if (!surface) return {};
  const light = isLight(surface);
  const overlay = light ? profile.tint.light : profile.tint.dark;
  const [tint, tintX, tintXX] = overlay.alphas;
  const variables: Record<string, string> = {
    "--mi-tint-color": rgba(overlay.color, tint),
    "--mi-tint-x-color": rgba(overlay.color, tintX),
    "--mi-tint-xx-color": rgba(overlay.color, tintXX),
  };
  if (profile.contrastColorFromBackground) {
    variables["--mi-contrast-color"] = light ? "#000000" : "#ffffff";
  }
  if (profile.chipBrightness) {
    variables["--mi-chip-brightness"] = light
      ? profile.chipBrightness.light
      : profile.chipBrightness.dark;
  }
  return variables;
};

const buttonTintVariables = (
  button: string | undefined,
  profile: ThemeProfile
): Record<string, string> => {
  if (!button || !profile.buttonTint) return {};
  const overlay = isLight(button)
    ? profile.buttonTint.light
    : profile.buttonTint.dark;
  const [tint, tintX] = overlay.alphas;
  return {
    "--mi-button-tint-color": rgba(overlay.color, tint),
    "--mi-button-tint-x-color": rgba(overlay.color, tintX),
  };
};

export const isSchemeLight = (surface: string): boolean => {
  const brightness = getBrightness(surface);
  return (
    brightness === undefined || brightness > FIXED_SCHEME_BRIGHTNESS_THRESHOLD
  );
};

const fixedVariables = (
  surface: string | undefined,
  profile: ThemeProfile
): Record<string, string> => {
  if (!surface || !profile.fixedColorsFromBackground) return {};
  const pageLight = isSchemeLight(surface);
  return {
    "--mi-fixed-bg-color": pageLight
      ? "var(--mi-off-white)"
      : "var(--mi-black)",
    "--mi-fixed-fg-color": pageLight
      ? "var(--mi-black)"
      : "var(--mi-off-white)",
  };
};

export const deriveThemeVariables = (
  colors: ArtistColors,
  profile: ThemeProfile
): Record<string, string> => ({
  ...baseVariables(colors, profile),
  ...tintVariables(colors.background, profile),
  ...buttonTintVariables(colors.button, profile),
  ...fixedVariables(colors.background, profile),
});
