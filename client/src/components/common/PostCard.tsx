import { bp } from "../../constants";
import { css } from "@emotion/css";
import MarkdownContent from "./MarkdownContent";
import Box from "./Box";
import { Link } from "react-router-dom";

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
        @media screen and (max-width: ${bp.small}px) {
          font-size: var(--mi-font-size-small) !important;
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
          background-color: var(--mi-light-background-color);
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
                position: absolute;
                z-index: +1;
              `}
            >
              by{" "}
              <Link to={`/${p.artist.urlSlug ?? p.artist.id}`}>
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
              <Link
                to={`/post/${p.id}/`}
                className={css`
                  font-weight: normal;
                  text-align: center;
                `}
              >
                {p.title}
              </Link>
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
            <MarkdownContent content={p.content} />
          </span>
        </div>
      </div>
    </Box>
  );
};
export default PostCard;
