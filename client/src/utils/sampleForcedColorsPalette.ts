import { cssColorToHex, getContrastRatio } from "./colors";

function sampleCssValue(
  cssKeyword: string,
  property: "color" | "backgroundColor"
): string | undefined {
  if (typeof document === "undefined") return undefined;
  const el = document.createElement("span");
  el.dataset.miSystemColor = cssKeyword;
  el.style[property] = cssKeyword;
  el.setAttribute("aria-hidden", "true");
  document.body.appendChild(el);
  try {
    const computed = getComputedStyle(el)[property];
    return cssColorToHex(computed);
  } finally {
    document.body.removeChild(el);
  }
}

/** Pick black or white for AA contrast against a surface color. */
export function contrastingBlackOrWhite(surface: string): string {
  const blackRatio = getContrastRatio("#000000", surface) ?? 0;
  const whiteRatio = getContrastRatio("#ffffff", surface) ?? 0;
  return whiteRatio >= blackRatio ? "#ffffff" : "#000000";
}

/**
 * Sample OS/browser forced-colors system colors into artist color slots as hex.
 */
export function sampleForcedColorsPalette(): ArtistColors {
  const background = sampleCssValue("Canvas", "backgroundColor") ?? "#ffffff";
  const text = sampleCssValue("CanvasText", "color") ?? "#000000";
  const secondaryText = sampleCssValue("CanvasText", "color") ?? text;
  const button = sampleCssValue("LinkText", "color") ?? "#0000ee";
  const buttonText = contrastingBlackOrWhite(button);

  return {
    background,
    text,
    secondaryText,
    button,
    buttonText,
  };
}
