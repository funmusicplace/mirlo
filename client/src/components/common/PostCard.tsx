import { css } from "@emotion/css";
import Box from "./Box";
import { Link } from "react-router-dom";
import { getArtistUrlReference, getPostURLReference } from "utils/artist";

const PostCard: React.FC<{
  height: string;
  width: string;
  dateposition: string;
  p: Post;
}> = ({ height, width, dateposition, p }) => {
  return (
    <Box
      key={p.id}
      className={css`
        height: ${height};
        width: ${width} !important;
        border: solid 1px transparent;
        margin-bottom: 0 !important;
        overflow: hidden;
        padding: 0 !important;
        justify-content: space-between;

        @media (prefers-color-scheme: dark) {
          background-color: var(--mi-normal-background-color);
        }
      `}
    >
      <div
        className={css`
          padding: 1.5rem;
          margin: 0;
          width: 100%;
          overflow: hidden;
          transition: 0.2s ease-in-out;
        `}
      >
        {p.artist && (
          <div
            className={css`
              padding-bottom: 2rem;
            `}
          >
            <div
              className={css`
                white-space: nowrap;
                width: 90%;
                overflow: hidden;
                text-overflow: ellipsis;
                padding-right: 3rem;
                position: absolute;
                z-index: +1;
              `}
            >
              by{" "}
              <Link to={`/${getArtistUrlReference(p.artist)}`}>
                {p.artist?.name}
              </Link>
            </div>
          </div>
        )}
        <div
          className={css`
            width: 100%;
          `}
        >
          <div
            className={css`
              display: flex;
              justify-content: space-between;
              align-items: center;
              flex-wrap: wrap;
              margin-bottom: 0.5rem;
            `}
          >
            <h4
              className={css`
                padding-bottom: 0.3rem;
                text-align: left;
              `}
            >
              {p.artist && (
                <Link
                  to={getPostURLReference(p)}
                  className={css`
                    font-weight: normal;
                    text-align: center;
                  `}
                >
                  {p.title}
                </Link>
              )}
            </h4>
            <span
              className={css`
                color: grey;
                width: ${dateposition};
                text-transform: uppercase;
                font-size: var(--mi-font-size-small);
              `}
            >
              {new Date(p.publishedAt).toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
            </span>
          </div>
        </div>
        <div
          className={css`
            width: 100%;
          `}
        >
          <span
            className={css`
              display: block;
              overflow: hidden;
              text-overflow: ellipsis;
              color: var(--mi-normal-foreground-color);
            `}
          >
            <div dangerouslySetInnerHTML={{ __html: p.content }} />
            {/* <MarkdownContent content={p.content} /> */}
          </span>
        </div>
      </div>
    </Box>
  );
};
export default PostCard;
