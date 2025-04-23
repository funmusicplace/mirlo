import { css } from "@emotion/css";

const TrackAuthors: React.FC<{ track: Track; trackGroupArtistId?: number }> = ({
  track,
  trackGroupArtistId,
}) => {
  const coAuthors =
    track.trackArtists?.filter((artist) => artist.isCoAuthor) ?? [];

  return (
    <>
      {coAuthors.find((author) => author.artistId !== trackGroupArtistId) && (
        <span
          className={
            css`
              color: var(--mi-normal-foreground-color);
              margin-left: 0.5rem;
            ` +
            " " +
            "track-authors"
          }
        >
          {coAuthors.map((a) => a.artistName).join(", ")}
        </span>
      )}
    </>
  );
};

export default TrackAuthors;
