export function getBrightness(hex: string): number | undefined {
  let sanitized = hex.replace(/^#/, "");
  if (/^[0-9a-fA-F]{3}$/.test(sanitized)) {
    sanitized = sanitized
      .split("")
      .map((c) => c + c)
      .join("");
  }
  if (!/^[0-9a-fA-F]{6}$/.test(sanitized)) {
    return undefined;
  }
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
