function sanitizeHex(hex: string): string | undefined {
  let sanitized = hex.replace(/^#/, "");
  if (/^[0-9a-fA-F]{3,4}$/.test(sanitized)) {
    sanitized = sanitized
      .split("")
      .map((c) => c + c)
      .join("");
  }
  if (!/^[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/.test(sanitized)) {
    return undefined;
  }
  return sanitized;
}

function channelToLinear(channel: number): number {
  const s = channel / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

function relativeLuminance(hex: string): number | undefined {
  const sanitized = sanitizeHex(hex);
  if (!sanitized) return undefined;
  const r = parseInt(sanitized.slice(0, 2), 16);
  const g = parseInt(sanitized.slice(2, 4), 16);
  const b = parseInt(sanitized.slice(4, 6), 16);
  return (
    0.2126 * channelToLinear(r) +
    0.7152 * channelToLinear(g) +
    0.0722 * channelToLinear(b)
  );
}

/** WCAG 2.1 contrast ratio between two hex colors (1–21). */
export function getContrastRatio(fg: string, bg: string): number | undefined {
  const fgL = relativeLuminance(fg);
  const bgL = relativeLuminance(bg);
  if (fgL === undefined || bgL === undefined) return undefined;
  const lighter = Math.max(fgL, bgL);
  const darker = Math.min(fgL, bgL);
  return (lighter + 0.05) / (darker + 0.05);
}

export const HIGH_CONTRAST_LIGHT: ArtistColors = {
  background: "#ffffff",
  text: "#111111",
  secondaryText: "#111111",
  button: "#be3455",
  buttonText: "#ffffff",
};

export function getBrightness(hex: string): number | undefined {
  const sanitized = sanitizeHex(hex);
  if (!sanitized) return undefined;
  const r = parseInt(sanitized.slice(0, 2), 16);
  const g = parseInt(sanitized.slice(2, 4), 16);
  const b = parseInt(sanitized.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000;
}

export function isLight(hex: string): boolean {
  const brightness = getBrightness(hex);
  return brightness === undefined ? true : brightness > 165;
}

export function contrastShift(color: string, amount: number = 15): string {
  const target = isLight(color) ? "black" : "white";
  return `color-mix(in srgb, ${color} ${100 - amount}%, ${target})`;
}

/** Convert CSS `rgb()` / `rgba()` / hex from getComputedStyle to `#rrggbb`. */
export function cssColorToHex(cssColor: string): string | undefined {
  const trimmed = cssColor.trim();
  if (trimmed.startsWith("#")) {
    const sanitized = sanitizeHex(trimmed);
    return sanitized ? `#${sanitized}` : undefined;
  }
  const match = trimmed.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (!match) return undefined;
  const toHex = (n: string) =>
    Math.max(0, Math.min(255, parseInt(n, 10)))
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(match[1])}${toHex(match[2])}${toHex(match[3])}`;
}
