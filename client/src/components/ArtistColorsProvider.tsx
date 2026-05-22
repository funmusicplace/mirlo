import { css, cx } from "@emotion/css";
import styled from "@emotion/styled";
import { useQuery } from "@tanstack/react-query";
import { queryArtist, queryManagedArtist } from "queries";
import React from "react";
import { useParams } from "react-router-dom";

import { getBrightness, isLight } from "../utils/colors";

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

export const ArtistColorsWrapper: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => {
  const ctx = React.useContext(ArtistColorsContext);
  const style: React.CSSProperties | undefined = ctx
    ? {
        ...(buildVarMap(ctx.colors) as React.CSSProperties),
        ...tintStyleFor(ctx.colors.background),
        ...buttonTintStyleFor(ctx.colors.button),
        ...fixedStyleFor(ctx.colors.background),
      }
    : undefined;
  return (
    <div className={className} style={style}>
      {children}
    </div>
  );
};

export const useIsArtistPageLight = (): boolean | null => {
  const ctx = React.useContext(ArtistColorsContext);
  const bg = ctx?.colors.background;
  if (!bg) return null;
  const brightness = getBrightness(bg);
  if (brightness === undefined) return true;
  return brightness > 100;
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

const tintStyleFor = (surface: string | undefined): React.CSSProperties => {
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

const fixedStyleFor = (surface: string | undefined): React.CSSProperties => {
  if (!surface) return {};
  const brightness = getBrightness(surface);
  const pageLight = brightness === undefined ? true : brightness > 100;
  return {
    "--mi-fixed-bg-color": pageLight
      ? "var(--mi-off-white)"
      : "var(--mi-black)",
    "--mi-fixed-fg-color": pageLight
      ? "var(--mi-black)"
      : "var(--mi-off-white)",
  } as React.CSSProperties;
};

const ArtistColorsProvider: React.FC<{ children: React.ReactElement }> = ({
  children,
}) => {
  const params = useParams();
  const artistId = params?.artistId ?? "";

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

  const hasArtist = artistId !== "" && (artist || managedArtist);

  const varStyle: React.CSSProperties = hasArtist
    ? {
        ...(buildVarMap(colors) as React.CSSProperties),
        ...tintStyleFor(colors.background),
        ...buttonTintStyleFor(colors.button),
        ...fixedStyleFor(colors.background),
      }
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
