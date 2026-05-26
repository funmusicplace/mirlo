export const API_ROOT = import.meta.env.VITE_API_DOMAIN;

export const bp = {
  small: "576",
  medium: "768",
  large: "992",
  xlarge: "1280",
  xxlarge: "1400",
};

export const between = (min: string, max: string) =>
  `(min-width: ${Number(min) + 1}px) and (max-width: ${max}px)`;
