import { css } from "@emotion/css";
import ImageWithPlaceholder from "components/common/ImageWithPlaceholder";
import { Link } from "react-router-dom";
import { bp } from "../../constants";
import { getReleaseUrl } from "utils/artist";

const PlayingTrackDetails: React.FC<{ currentTrack: Track }> = ({
  currentTrack,
}) => {
  const artists =
    currentTrack.trackArtists?.filter((artist) => artist.isCoAuthor) ?? [];

  if (artists.length === 0) {
    artists.push({
      artistId: currentTrack.trackGroup.artistId,
      artistName: currentTrack.trackGroup.artist.name,
    });
  }

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
        margin-bottom: 0.3rem;
        padding-top: 0.5rem;

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
        >
          {currentTrack?.title}
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
                font-weight: bold;
                overflow: hidden;
                white-space: nowrap;
                text-overflow: ellipsis;
              `}
            >
              {artists.map((artist) => (
                <>
                  {artist.artistId ? (
                    <Link to={`/${artist.artistId}`} id="player-artist-name">
                      {artist.artistName}
                    </Link>
                  ) : (
                    artist.artistName
                  )}
                </>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PlayingTrackDetails;
