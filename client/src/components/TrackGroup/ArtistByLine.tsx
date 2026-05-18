import { css } from "@emotion/css";
import { ArtistButtonLink } from "components/Artist/ArtistButtons";
import { Trans, useTranslation } from "react-i18next";
import { getArtistUrl, getReleaseUrl } from "utils/artist";

const inlineLink = css`
  display: inline !important;
  white-space: normal !important;
  word-break: break-word;
`;

const ArtistByLine: React.FC<{
  artist: Artist;
  trackGroup?: TrackGroup;
  showFromAlbum?: boolean;
}> = ({ artist, trackGroup, showFromAlbum }) => {
  const { t } = useTranslation("translation", {
    keyPrefix: "trackGroupDetails",
  });

  const labelArtist = trackGroup?.paymentToUserId
    ? artist.artistLabels?.find(
        (al) => al.labelUserId === trackGroup.paymentToUserId
      )?.labelUser.artists?.[0]
    : undefined;

  return (
    <div
      className={css`
        font-size: 18px;
        font-style: normal;
      `}
    >
      {showFromAlbum && trackGroup && (
        <>
          <Trans
            t={t}
            i18nKey="fromAlbum"
            values={{
              album: trackGroup.title,
            }}
            components={{
              albumLink: (
                <ArtistButtonLink
                  className={inlineLink}
                  variant="link"
                  to={getReleaseUrl(artist, trackGroup)}
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
              className={inlineLink}
              variant="link"
              to={getArtistUrl(artist)}
            ></ArtistButtonLink>
          ),
        }}
      />
      {labelArtist && (
        <>
          {" "}
          <Trans
            t={t}
            i18nKey="onLabel"
            values={{
              label: labelArtist.name,
            }}
            components={{
              labelLink: (
                <ArtistButtonLink
                  className={inlineLink}
                  variant="link"
                  to={getArtistUrl(labelArtist)}
                ></ArtistButtonLink>
              ),
            }}
          />
        </>
      )}
    </div>
  );
};

export default ArtistByLine;
