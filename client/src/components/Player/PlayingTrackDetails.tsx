import { css } from "@emotion/css";
import ImageWithPlaceholder from "components/common/ImageWithPlaceholder";
import { Link } from "react-router-dom";
import { bp } from "../../constants";

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

        margin-right: 1rem;
        margin-left: 1rem;
        margin-bottom: 0.3rem;
        padding-top: 0.5rem;

        @media (max-width: ${bp.small}px) {
          margin-right: 0.5rem;
          margin-left: 0.5rem;
        }
      `}
    >
      <div>
        <ImageWithPlaceholder
          src={currentTrack?.trackGroup.cover?.sizes?.[120]}
          size={48}
          alt={currentTrack?.title ?? "Loading album"}
          className={css`
            background-color: #efefef;
            margin-right: 0.5rem;
            min-height: 100%;
            min-width: 48px;
          `}
        />
      </div>
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
          `}
        >
          {currentTrack?.title}
        </div>
        {currentTrack?.trackGroup && (
          <>
            <div
              className={css`
                opacity: 0.6;
                text-transform: capitalize;
                color: grey;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
              `}
            >
              <Link
                to={`/${currentTrack.trackGroup.artist?.urlSlug}/release/${currentTrack.trackGroup.urlSlug}`}
              >
                {currentTrack.trackGroup.title}
              </Link>
            </div>
            <div
              className={css`
          text-transform: capitalize;
          font-weight: bold;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
          }
        `}
            >
              <Link to={`/${currentTrack.trackGroup.artistId}`}>
                {currentTrack.trackGroup.artist?.name}
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PlayingTrackDetails;
