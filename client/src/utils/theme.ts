import { color } from "./mirloDesignScales";

const typography = {
  fontFamily:
    "'Arial', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
};

const dark = {
  colors: {
    primary: color.pink.main,
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
  borderRadius: ".2rem",
  typography,
};

const light = {
  colors: {
    primary: color.pink.main,
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
  borderRadius: ".2rem",
  typography,
};

const theme = { dark, light };

export default theme;
