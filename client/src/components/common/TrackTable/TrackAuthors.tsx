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
              color: var(--mi-lighter-foreground-color);
              margin-left: 0.5rem;

              @media (prefers-color-scheme: dark) {
                color: var(--mi-light-foreground-color);
              }
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
