import { css } from "@emotion/css";
import styled from "@emotion/styled";
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
  document.documentElement.setAttribute("data-mi-theme", theme ?? "light");

  document.documentElement.style.setProperty(
    "--mi-normal-background-color",
    colors[theme ?? "light"]["background"]
  );
  document.documentElement.style.setProperty(
    "--mi-normal-foreground-color",
    colors[theme ?? "light"]["foreground"]
  );
};

const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)");
prefersDark?.addEventListener("change", () =>
  updateTheme(undefined, prefersDark.matches ? "dark" : "light")
);

const WrapperDiv = styled.div``;

const ArtistColors: React.FC<{
  artistId: string;
  children: React.ReactElement;
}> = ({ artistId, children }) => {
  const { data: managedArtist } = useQuery(
    queryManagedArtist(Number(artistId))
  );
  const { data: artist } = useQuery(queryArtist({ artistSlug: artistId }));

  const artistColors =
    managedArtist?.properties?.colors ?? artist?.properties?.colors;

  React.useEffect(() => {
    updateTheme(artistColors, prefersDark.matches ? "dark" : "light");
  }, [artistColors]);

  if (!artist) {
    return <WrapperDiv>{children}</WrapperDiv>;
  } else {
    return (
      <WrapperDiv
        id="artist-colors-wrapper"
        className={css`
          background-color: ${artistColors?.background ??
          "var(--mi-normal-background-color)"};
          color: ${artistColors?.foreground ??
          "var(--mi-normal-foreground-color)"};
        `}
      >
        {children}
      </WrapperDiv>
    );
  }
};

const ArtistColorsWrapper: React.FC<{ children: React.ReactElement }> = ({
  children,
}) => {
  const params = useParams();
  const artistId = params?.artistId ?? "";
  // Because of type mismatch we couldn't choose which of these to query
  if (artistId === "") {
    return <WrapperDiv>{children}</WrapperDiv>;
  }
  return <ArtistColors artistId={artistId} children={children} />;
};

export default ArtistColorsWrapper;
