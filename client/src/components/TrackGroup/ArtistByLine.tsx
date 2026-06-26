import { css } from "@emotion/css";
import { ArtistButtonLink } from "components/Artist/ArtistButtons";
import { Trans, useTranslation } from "react-i18next";
import { getArtistUrl, getReleaseUrl } from "utils/artist";

import { coverSizeMax } from "pages/:artistId/release/:trackGroupId/Index";

const inlineLink = css`
  && {
    display: inline !important;
    white-space: normal !important;
    word-break: break-word;
    overflow-wrap: anywhere;
  }
`;

export const FromAlbum: React.FC<{
  artist: Artist;
  trackGroup: TrackGroup;
}> = ({ artist, trackGroup }) => {
  const { t } = useTranslation("translation", {
    keyPrefix: "trackGroupDetails",
  });

  return (
    <Trans
      t={t}
      i18nKey="fromAlbum"
      values={{
        album: trackGroup.title,
      }}
      components={{
        albumLink: (
          <ArtistButtonLink
            className="inline! whitespace-normal! underline!"
            variant="link"
            to={getReleaseUrl(artist, trackGroup)}
          ></ArtistButtonLink>
        ),
      }}
    />
  );
};

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
        font-size: clamp(
          0.875rem,
          calc(var(--cover-size, ${coverSizeMax}) / 28),
          1.125rem
        );
        font-style: normal;
      `}
    >
      {showFromAlbum && trackGroup && (
        <div className="sm:hidden">
          <FromAlbum artist={artist} trackGroup={trackGroup} />
        </div>
      )}
      <div>
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
            <span aria-hidden>·</span>{" "}
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
    </div>
  );
};

export default ArtistByLine;
