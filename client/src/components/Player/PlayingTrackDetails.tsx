import { css } from "@emotion/css";
import ImageWithPlaceholder from "components/common/ImageWithPlaceholder";
import { Link } from "react-router-dom";
import { bp } from "../../constants";
import { getReleaseUrl, getTrackUrl } from "utils/artist";
import React from "react";

export const TrackArtistLinks: React.FC<{
  track: Track;
  target?: "_blank";
  fullLink?: boolean;
}> = ({ track, target, fullLink }) => {
  const artists: { artistId?: string | number; artistName?: string }[] =
    track.trackArtists?.filter((artist) => artist.isCoAuthor) ?? [];

  if (artists.length === 0) {
    artists.push({
      artistId: track.trackGroup.artist.urlSlug ?? track.trackGroup.artistId,
      artistName: track.trackGroup.artist.name,
    });
  }

  return artists.map((artist, index) => (
    <React.Fragment key={artist.artistName}>
      {artist.artistId ? (
        <>
          {fullLink ? (
            <a
              target={`"_blank"`}
              href={`${import.meta.env.VITE_CLIENT_DOMAIN}/${artist.artistId}`}
            >
              {artist.artistName}
            </a>
          ) : (
            <Link
              to={`/${artist.artistId}`}
              id="player-artist-name"
              target={target}
            >
              {artist.artistName}
            </Link>
          )}
        </>
      ) : (
        artist.artistName
      )}
      {index < artists.length - 1 && ", "}
    </React.Fragment>
  ));
};

const PlayingTrackDetails: React.FC<{ currentTrack: Track }> = ({
  currentTrack,
}) => {
  return (
    <div
      className={css`
        width: 40%;
        flex: 40%;
        display: flex;
        align-items: center;
        gap: 0.5rem;

        margin-right: 1rem;
        margin-left: 1rem;
        margin-bottom: 0.5rem;
        padding-top: 0.7rem;

        a {
          text-decoration: none;
        }

        @media (max-width: ${bp.small}px) {
          margin-right: 0.5rem;
          margin-left: 0.5rem;
        }
      `}
    >
      <ImageWithPlaceholder
        src={currentTrack?.trackGroup.cover?.sizes?.[120]}
        size={48}
        square
        objectFit="contain"
        alt={currentTrack?.title ?? "Loading album"}
        className={css`
          width: 48px;
          height: 48px;
          flex-basis: 48px;
        `}
      />
      <div
        className={css`
          max-width: 80%;
          flex: 80%;
          display: flex;
          flex-direction: column;
          @media (max-width: ${bp.small}px) {
            max-width: 70%;
            flex: 70%;
          }
        `}
      >
        <div
          className={css`
            overflow: hidden;
            white-space: nowrap;
            text-overflow: ellipsis;
            font-size: var(--mi-font-size-normal);
          `}
          id="player-track-title"
          title={currentTrack?.title}
        >
          <Link
            to={getTrackUrl(
              currentTrack.trackGroup.artist,
              currentTrack.trackGroup,
              currentTrack
            )}
          >
            {currentTrack?.title}
          </Link>
        </div>
        {currentTrack?.trackGroup && (
          <>
            <div
              className={css`
                opacity: 0.6;
                color: grey;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
              `}
              title={currentTrack.trackGroup.title}
            >
              {currentTrack.trackGroup.artist && (
                <Link
                  to={getReleaseUrl(
                    currentTrack.trackGroup.artist,
                    currentTrack.trackGroup
                  )}
                  id="player-trackGroup-title"
                >
                  {currentTrack.trackGroup.title}
                </Link>
              )}
            </div>
            <div
              className={css`
                overflow: hidden;
                white-space: nowrap;
                text-overflow: ellipsis;
              `}
            >
              <TrackArtistLinks track={currentTrack} />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PlayingTrackDetails;
