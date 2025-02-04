import { css } from "@emotion/css";
import { useQuery } from "@tanstack/react-query";
import { queryArtist, queryManagedArtist } from "queries";
import React from "react";
import { useParams } from "react-router-dom";

const colorDefined = (color?: string) => {
  return color && color !== "";
};

const colors = {
  dark: {
    primary: "#ffc0cb",
    secondary: "#be3455",
    foreground: "#fff",
    background: "#111",
  },
  light: {
    primary: "#be3455",
    secondary: "#ffc0cb",
    foreground: "#111",
    background: "#f5f0f0",
  },
};

const updateTheme = (artistColors?: any, theme?: "dark" | "light") => {
  console.log("updatinmg theme", artistColors, theme);
  document.documentElement.setAttribute("data-mi-theme", theme ?? "light");
  if (artistColors) {
    // document.documentElement.style.setProperty(
    //   "--mi-primary-color",
    //   artistColors.primary
    // );
    // document.documentElement.style.setProperty(
    //   "--mi-secondary-color",
    //   artistColors.secondary
    // );
    document.documentElement.style.setProperty(
      "--mi-normal-background-color",
      artistColors.background
    );
    document.documentElement.style.setProperty(
      "--mi-normal-foreground-color",
      artistColors.foreground
    );
  } else {
    // document.documentElement.style.setProperty(
    //   "--mi-primary-color",
    //   colors[theme ?? "light"]["primary"]
    // );
    // document.documentElement.style.setProperty(
    //   "--mi-secondary-color",
    //   colors[theme ?? "light"]["secondary"]
    // );
    document.documentElement.style.setProperty(
      "--mi-normal-background-color",
      colors[theme ?? "light"]["background"]
    );
    document.documentElement.style.setProperty(
      "--mi-normal-foreground-color",
      colors[theme ?? "light"]["foreground"]
    );
  }
};

const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)");
prefersDark?.addEventListener("change", () =>
  updateTheme(undefined, prefersDark.matches ? "dark" : "light")
);

const ArtistColorsWrapper: React.FC<{ children: React.ReactElement }> = ({
  children,
}) => {
  const params = useParams();
  const artistId = params?.artistId ?? "";
  // Because of type mismatch we couldn't choose which of these to query
  const { data: managedArtist } = useQuery(
    queryManagedArtist(Number(artistId))
  );
  const { data: artist } = useQuery(queryArtist({ artistSlug: artistId }));

  const artistColors =
    managedArtist?.properties?.colors ?? artist?.properties?.colors;

  React.useEffect(() => {
    console.log("prefersDark", prefersDark.matches);

    updateTheme(artistColors, prefersDark.matches ? "dark" : "light");
  }, [artistColors]);

  return (
    <div
      id="artist-colors-wrapper"
      className={css`
        display: flex;
        flex-direction: column;
        min-height: 100vh;

        background-color: var(--mi-normal-background-color);
        color: var(--mi-normal-foreground-color);

        [data-mi-theme="dark"] & {
          background-color: var(--mi-normal-background-color);
          color: var(--mi-normal-foreground-color);
        }
      `}
    >
      {children}
    </div>
  );
};

export default ArtistColorsWrapper;
