import { css } from "@emotion/css";
import useArtistColors from "utils/useArtistColors";

const colorDefined = (color?: string) => {
  return color && color !== "";
};

const ArtistColorsWrapper: React.FC<{ children: React.ReactElement }> = ({
  children,
}) => {
  const artistColors = useArtistColors();

  return (
    <div
      className={css`
        display: flex;
        flex-direction: column;
        min-height: 100vh;

        ${artistColors &&
        `
    ${
      colorDefined(artistColors.background) &&
      `--mi-normal-background-color: ${artistColors.background};`
    }
    ${
      colorDefined(artistColors.primary) &&
      `--mi-primary-color: ${artistColors.primary};`
    }
    ${
      colorDefined(artistColors.secondary) &&
      `--mi-secondary-color: ${artistColors.secondary};`
    }
    ${
      colorDefined(artistColors.foreground) &&
      `--mi-normal-foreground-color: ${artistColors.foreground} !important;`
    }
    `}

        background-color: var(--mi-normal-background-color);
        color: var(--mi-normal-foreground-color);
      `}
    >
      {children}
    </div>
  );
};

export default ArtistColorsWrapper;
