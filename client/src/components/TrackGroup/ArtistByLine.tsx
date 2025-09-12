import { css } from "@emotion/css";
import { ArtistButtonLink } from "components/Artist/ArtistButtons";

import { Trans, useTranslation } from "react-i18next";
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
                <ArtistButtonLink
                  to={getReleaseUrl(artist, fromAlbum)}
                ></ArtistButtonLink>
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
            <ArtistButtonLink
              variant="link"
              to={getArtistUrl(artist)}
            ></ArtistButtonLink>
          ),
        }}
      />
    </div>
  );
};

export default ArtistByLine;
