import { css } from "@emotion/css";
import { ArtistButtonLink } from "components/Artist/ArtistButtons";
import { Trans, useTranslation } from "react-i18next";
import { getArtistUrl, getReleaseUrl } from "utils/artist";

import { coverSizeMax } from "../../constants";

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

export const getReleaseLabel = (artist: Artist, trackGroup?: TrackGroup) =>
  trackGroup?.paymentToUserId
    ? artist.artistLabels?.find(
        (al) => al.labelUserId === trackGroup.paymentToUserId
      )?.labelUser.artists?.[0]
    : undefined;

export const OnLabel: React.FC<{
  label: { name: string; urlSlug?: string; id?: number };
  standalone?: boolean;
}> = ({ label, standalone }) => {
  const { t } = useTranslation("translation", {
    keyPrefix: "trackGroupDetails",
  });

  return (
    <Trans
      t={t}
      i18nKey={standalone ? "onLabelStandalone" : "onLabel"}
      values={{
        label: label.name,
      }}
      components={{
        labelLink: (
          <ArtistButtonLink
            className={inlineLink}
            variant="link"
            to={getArtistUrl(label)}
          ></ArtistButtonLink>
        ),
      }}
    />
  );
};

const ArtistByLine: React.FC<{
  artist: Artist;
  trackGroup?: TrackGroup;
  hideLabel?: boolean;
  coArtists?: React.ReactElement;
}> = ({ artist, trackGroup, hideLabel, coArtists }) => {
  const { t } = useTranslation("translation", {
    keyPrefix: "trackGroupDetails",
  });

  const labelArtist = hideLabel
    ? undefined
    : getReleaseLabel(artist, trackGroup);

  return (
    <div
      className={css`
        font-size: clamp(
          0.875rem,
          calc(var(--cover-size, ${coverSizeMax}) / 28),
          1.125rem
        );
        font-style: normal;
        overflow-wrap: anywhere;
      `}
    >
      <div>
        <Trans
          t={t}
          i18nKey={coArtists ? "byArtistWithArtists" : "byArtist"}
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
            ...(coArtists ? { artists: coArtists } : {}),
          }}
        />
        {labelArtist && (
          <>
            {" "}
            <span aria-hidden>·</span> <OnLabel label={labelArtist} />
          </>
        )}
      </div>
    </div>
  );
};

export default ArtistByLine;
