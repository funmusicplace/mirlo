import { css } from "@emotion/css";
import { useQuery } from "@tanstack/react-query";
import { queryArtist, queryManagedArtist } from "queries";
import { useLocation, useParams } from "react-router-dom";
import { useAuthContext } from "state/AuthContext";

const colorDefined = (color?: string) => {
  return color && color !== "";
};

const ArtistColorsWrapper: React.FC<{ children: React.ReactElement }> = ({
  children,
}) => {
  const params = useParams();
  const artistId = params?.artistId ?? "";
  const { user } = useAuthContext();
  const userId = user?.id;

  // Because of type mismatch we couldn't choose which of these to query
  const { data: managedArtist } = useQuery(
    queryManagedArtist(Number(userId), Number(artistId))
  );
  const { data: artist } = useQuery(queryArtist({ artistSlug: artistId }));

  const artistColors =
    managedArtist?.properties?.colors ?? artist?.properties?.colors;

  return (
    <div
      id="artist-colors-wrapper"
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
