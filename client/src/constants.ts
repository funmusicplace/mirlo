export const API_ROOT = import.meta.env.VITE_API_DOMAIN;

export const bp = {
  small: "576",
  medium: "768",
  large: "992",
  xlarge: "1280",
  xxlarge: "1400",
};

export const between = (min: string, max: string) =>
  `screen and (min-width: ${Number(min) + 1}px) and (max-width: ${max}px)`;

export const pageScaleBp = {
  full: "1500",
  medium: bp.xlarge,
  small: "1100",
  tiny: "900",
};

export const pageScaleCascade = `
  @media screen and (min-width: ${Number(bp.medium) + 1}px) { --page-scale: 1; }
  @media ${between(bp.medium, pageScaleBp.full)} { --page-scale: 0.9; }
  @media ${between(bp.medium, pageScaleBp.medium)} { --page-scale: 0.8; }
  @media ${between(bp.medium, pageScaleBp.small)} { --page-scale: 0.72; }
  @media ${between(bp.medium, pageScaleBp.tiny)} { --page-scale: 0.65; }
`;
