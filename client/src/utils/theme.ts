export const theme = {
  colors: {
    primary: "#0096a8",
    primaryHighlight: "#bcb3ff",
    text: "var(--mi-normal-foreground-color)",
    textDark: "white",
    background: "var(--mi-normal-background-color)",
    backgroundDark: "#333",
    warning: "#f04e37",
    success: "#4cdb5f",
  },
  borderRadius: ".5rem",
};

/**
 * @param color Hex value format: #ffffff or ffffff
 * @param decimal lighten or darken decimal value, between -255 and +255
 */
export const colorShade = (col: string, amt: number) => {
  col = col.replace(/^#/, "");
  if (col.length === 3)
    col = col[0] + col[0] + col[1] + col[1] + col[2] + col[2];

  // @ts-ignore
  let [r, g, b] = col.match(/.{2}/g);
  [r, g, b] = [
    parseInt(r, 16) + amt,
    parseInt(g, 16) + amt,
    parseInt(b, 16) + amt,
  ];

  r = Math.max(Math.min(255, r), 0).toString(16);
  g = Math.max(Math.min(255, g), 0).toString(16);
  b = Math.max(Math.min(255, b), 0).toString(16);

  const rr = (r.length < 2 ? "0" : "") + r;
  const gg = (g.length < 2 ? "0" : "") + g;
  const bb = (b.length < 2 ? "0" : "") + b;

  return `#${rr}${gg}${bb}`;
};
