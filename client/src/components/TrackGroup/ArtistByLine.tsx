import { css } from "@emotion/css";
import ArtistRouterLink from "components/Artist/ArtistRouterLink";

import { Trans, useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { getArtistUrl, getReleaseUrl } from "utils/artist";

const ArtistByLine: React.FC<{ artist: Artist; fromAlbum?: TrackGroup }> = ({
  artist,
  fromAlbum,
}) => {
  const { t } = useTranslation("translation", {
    keyPrefix: "trackGroupDetails",
  });

  return (
    <div
      className={css`
        font-size: 18px;
        font-style: normal;
      `}
    >
      {fromAlbum && (
        <>
          <Trans
            t={t}
            i18nKey="fromAlbum"
            values={{
              album: fromAlbum.title,
            }}
            components={{
              albumLink: (
                <ArtistRouterLink
                  to={getReleaseUrl(artist, fromAlbum)}
                ></ArtistRouterLink>
              ),
            }}
          />{" "}
        </>
      )}
      <Trans
        t={t}
        i18nKey="byArtist"
        values={{
          artist: artist.name,
        }}
        components={{
          artistLink: (
            <ArtistRouterLink to={getArtistUrl(artist)}></ArtistRouterLink>
          ),
        }}
      />
    </div>
  );
};

export default ArtistByLine;
