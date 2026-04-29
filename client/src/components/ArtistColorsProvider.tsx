import { css, cx } from "@emotion/css";
import styled from "@emotion/styled";
import { useQuery } from "@tanstack/react-query";
import { queryArtist, queryManagedArtist } from "queries";
import React from "react";
import { useParams } from "react-router-dom";

import { isLight } from "../utils/colors";

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

const isDefined = (value?: string) => Boolean(value && value !== "");

export const resolveColors = (raw?: ArtistColors): ArtistColors => {
  const c = raw ?? {};
  const pick = (...vals: Array<string | undefined>) =>
    vals.find(isDefined) ?? undefined;
  return {
    button: pick(c.button),
    buttonText: pick(c.buttonText),
    background: pick(c.background),
    text: pick(c.text),
    secondaryText: pick(c.secondaryText, c.text),
  };
};

const buildVarMap = (colors: ArtistColors): Record<string, string> => {
  const map: Record<string, string> = {};
  for (const [slot, value] of Object.entries(colors)) {
    if (!isDefined(value)) continue;
    const cssVar = `--mi-${slot.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase())}-color`;
    map[cssVar] = value as string;
  }
  return map;
};

const tintStyleFor = (
  surface: string | undefined
): React.CSSProperties => {
  if (!surface) return {};
  const light = isLight(surface);
  return {
    "--mi-tint-color": light
      ? "rgba(0, 0, 0, 0.05)"
      : "rgba(255, 255, 255, 0.08)",
    "--mi-tint-x-color": light
      ? "rgba(0, 0, 0, 0.15)"
      : "rgba(255, 255, 255, 0.18)",
    "--mi-tint-xx-color": light
      ? "rgba(0, 0, 0, 0.3)"
      : "rgba(255, 255, 255, 0.35)",
    "--mi-contrast-color": light ? "#000000" : "#ffffff",
  } as React.CSSProperties;
};

const buttonTintStyleFor = (
  button: string | undefined
): React.CSSProperties => {
  if (!button) return {};
  const light = isLight(button);
  return {
    "--mi-button-tint-color": light
      ? "rgba(0, 0, 0, 0.1)"
      : "rgba(255, 255, 255, 0.12)",
    "--mi-button-tint-x-color": light
      ? "rgba(0, 0, 0, 0.2)"
      : "rgba(255, 255, 255, 0.24)",
  } as React.CSSProperties;
};

const ArtistColorsInner: React.FC<{
  artistId: string;
  children: React.ReactElement;
}> = ({ artistId, children }) => {
  const { data: managedArtist } = useQuery(
    queryManagedArtist(Number(artistId))
  );
  const { data: artist } = useQuery(queryArtist({ artistSlug: artistId }));

  const [preview, setPreview] = React.useState<ArtistColors | null>(null);
  const [transparentPreview, setTransparentContainerPreview] = React.useState<
    boolean | null
  >(null);

  const rawColors =
    preview ?? managedArtist?.properties?.colors ?? artist?.properties?.colors;

  const savedTransparent = Boolean(
    managedArtist?.properties?.transparentContainer ??
      artist?.properties?.transparentContainer
  );
  const transparentContainer =
    transparentPreview === null ? savedTransparent : transparentPreview;

  const colors = React.useMemo(() => resolveColors(rawColors), [rawColors]);

  const contextValue = React.useMemo(
    () => ({
      colors,
      transparentContainer,
      setPreview,
      setTransparentContainerPreview,
    }),
    [colors, transparentContainer]
  );

  if (!artist && !managedArtist) {
    return <RootDiv>{children}</RootDiv>;
  }

  const varStyle: React.CSSProperties = {
    ...(buildVarMap(colors) as React.CSSProperties),
    ...tintStyleFor(colors.background),
    ...buttonTintStyleFor(colors.button),
  };
  const rootBg = isDefined(colors.background)
    ? colors.background
    : "var(--mi-background-color)";
  const rootFg = isDefined(colors.text) ? colors.text : "var(--mi-text-color)";

  return (
    <ArtistColorsContext.Provider value={contextValue}>
      <RootDiv
        id="artist-colors-root"
        style={varStyle}
        className={cx(transparentContainer && "transparent-container", css`
          background-color: ${rootBg};
          color: ${rootFg};
        `)}
      >
        {children}
      </RootDiv>
    </ArtistColorsContext.Provider>
  );
};

const ArtistColorsProvider: React.FC<{ children: React.ReactElement }> = ({
  children,
}) => {
  const params = useParams();
  const artistId = params?.artistId ?? "";
  if (artistId === "") {
    return <RootDiv>{children}</RootDiv>;
  }
  return <ArtistColorsInner artistId={artistId}>{children}</ArtistColorsInner>;
};

export default ArtistColorsProvider;
