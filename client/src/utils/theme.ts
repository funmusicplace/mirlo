import { color } from "./mirloDesignScales";

const dark = {
  colors: {
    primary: "#0096a8",
    primaryHighlight: "#bcb3ff",
    text: color.white,
    textDark: color.white,
    background: color.black,
    backgroundDark: color.black,
    warning: "#f04e37",
    success: "#4cdb5f",
    translucentTint: "rgba(255, 255, 255, 0.05)",
    translucentShade: "rgba(0, 0, 0, .05)",
  },
  borderRadius: ".5rem",
};

const light = {
  colors: {
    primary: "#0096a8",
    primaryHighlight: "#bcb3ff",
    text: color.black,
    textDark: color.black,
    background: color.white,
    backgroundDark: color.white,
    warning: "#f04e37",
    success: "#4cdb5f",
    translucentTint: "rgba(255, 255, 255, 0.4)",
    translucentShade: "rgba(0, 0, 0, .05)",
  },
  borderRadius: ".5rem",
};

export default { dark, light };
