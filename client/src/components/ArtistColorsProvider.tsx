import { css, cx } from "@emotion/css";
import styled from "@emotion/styled";
import { useQuery } from "@tanstack/react-query";
import { useArtistHighContrast } from "utils/useArtistHighContrast";
import { queryArtist, queryManagedArtist } from "queries";
import React from "react";
import { useParams } from "react-router-dom";
import { resolveArtistColors } from "utils/resolveArtistColors";

import {
  ARTIST_THEME_PROFILE,
  deriveThemeVariables,
  isDefined,
  isSchemeLight,
} from "../utils/themeVariables";

const RootDiv = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
`;

type ArtistColorsContextValue = {
  colors: ArtistColors;
  transparentContainer: boolean;
  setPreview: (colors: ArtistColors | null) => void;
  setTransparentContainerPreview: (value: boolean | null) => void;
} | null;

const ArtistColorsContext = React.createContext<ArtistColorsContextValue>(null);

const noopSetPreview = () => {};

export const useArtistColorsPreview = () => {
  const ctx = React.useContext(ArtistColorsContext);
  return ctx?.setPreview ?? noopSetPreview;
};

export const useTransparentContainerPreview = () => {
  const ctx = React.useContext(ArtistColorsContext);
  return ctx?.setTransparentContainerPreview ?? noopSetPreview;
};

export const useTransparentContainer = (): boolean => {
  const ctx = React.useContext(ArtistColorsContext);
  return Boolean(ctx?.transparentContainer);
};

export const useIsArtistPageLight = (): boolean | null => {
  const ctx = React.useContext(ArtistColorsContext);
  const bg = ctx?.colors.background;
  if (!bg) return null;
  return isSchemeLight(bg);
};

const ArtistColorsProvider: React.FC<{ children: React.ReactElement }> = ({
  children,
}) => {
  const params = useParams();
  const artistIdParam = params?.artistId ?? "";

  const { data: managedArtist } = useQuery(
    queryManagedArtist(Number(artistIdParam))
  );
  const { data: artist } = useQuery(queryArtist({ artistSlug: artistIdParam }));

  const numericArtistId = managedArtist?.id ?? artist?.id;
  const highContrast = useArtistHighContrast(numericArtistId);

  const [preview, setPreview] = React.useState<ArtistColors | null>(null);
  const [transparentPreview, setTransparentContainerPreview] = React.useState<
    boolean | null
  >(null);

  const rawColors = highContrast
    ? undefined
    : (preview ??
      managedArtist?.properties?.colors ??
      artist?.properties?.colors);

  const savedTransparent = Boolean(
    managedArtist?.properties?.transparentContainer ??
    artist?.properties?.transparentContainer
  );
  const transparentContainer = highContrast
    ? false
    : transparentPreview === null
      ? savedTransparent
      : transparentPreview;

  const colors = React.useMemo(
    () => resolveArtistColors(rawColors, { highContrast }),
    [rawColors, highContrast]
  );

  const contextValue = React.useMemo(
    () => ({
      colors,
      transparentContainer,
      setPreview,
      setTransparentContainerPreview,
    }),
    [colors, transparentContainer]
  );

  const hasArtist = artistIdParam !== "" && (artist || managedArtist);

  const varStyle: React.CSSProperties = hasArtist
    ? (deriveThemeVariables(
        colors,
        ARTIST_THEME_PROFILE,
        highContrast
      ) as React.CSSProperties)
    : {};
  const rootBg =
    hasArtist && isDefined(colors.background)
      ? colors.background
      : "var(--mi-background-color)";
  const rootFg =
    hasArtist && isDefined(colors.text) ? colors.text : "var(--mi-text-color)";

  return (
    <ArtistColorsContext.Provider value={hasArtist ? contextValue : null}>
      <RootDiv
        id="artist-colors-root"
        style={varStyle}
        className={cx(
          hasArtist && transparentContainer && "transparent-container",
          hasArtist && highContrast && "high-contrast",
          css`
            background-color: ${rootBg};
            color: ${rootFg};
          `
        )}
      >
        {children}
      </RootDiv>
    </ArtistColorsContext.Provider>
  );
};

export default ArtistColorsProvider;
