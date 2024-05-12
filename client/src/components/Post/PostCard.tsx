import React from "react";
import styled from "@emotion/styled";
import { css } from "@emotion/css";
import Box from "components/common/Box";
import { Link } from "react-router-dom";
import { getArtistUrl, getPostURLReference } from "utils/artist";
import MarkdownWrapper from "components/common/MarkdownWrapper";
import Overlay from "components/common/Overlay";
import { getHtmlExcerpt } from "utils/getHtmlExcerpt";
import { useLinkContainer } from "utils/useLinkContainer";

const PostContainer = styled.li`
  display: flex;
  border-radius: 5px;
  background-color: var(--mi-darken-background-color);
  position: relative;
  filter: brightness(98%);
  width: 100%;
  cursor: pointer;

  .post-container__link {
    text-decoration: none;
  }

  &:hover {
    transition: 0.2s ease-in-out;
    background-color: rgba(50, 0, 0, 0.07);
    filter: brightness(90%);

    .post-container__link {
      text-decoration: underline;
    }
  }

  &:focus-within {
    outline: 1px solid var(--mi-normal-foreground-color);
  }

  @media (prefers-color-scheme: dark) {
    &:hover {
      filter: brightness(120%);
      background-color: rgba(100, 100, 100, 0.2);
    }
  }
`;

const PostCard: React.FC<{
  p: Post;
}> = ({ p }) => {
  const postUrl = getPostURLReference(p);
  const postContainerProps = useLinkContainer({ to: postUrl });

  // Use the first 8 paragraphs of the post as an unformatted excerpt
  const excerpt = React.useMemo(
    () => getHtmlExcerpt(p.content).slice(0, 8),
    [p.content]
  );

  return (
    <PostContainer {...postContainerProps}>
      <Overlay width="100%" height="100%"></Overlay>
      <Box
        key={p.id}
        className={css`
          height: 350px;
          width: 100% !important;
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
              <p
                className={css`
                  white-space: nowrap;
                  width: 90%;
                  text-overflow: ellipsis;
                  padding-right: 3rem;
                  position: absolute;
                `}
              >
                by <Link to={getArtistUrl(p.artist)}>{p.artist?.name}</Link>
              </p>
            </div>
          )}
          <div
            className={css`
              width: 100%;
              margin-bottom: 0.5rem;
            `}
          >
            <h3
              className={
                "h4 " +
                css`
                  padding-bottom: 0.3rem;
                  text-align: left;
                `
              }
            >
              {p.artist && (
                <Link
                  to={postUrl}
                  className={
                    "post-container__link " +
                    css`
                      font-weight: normal;
                      text-align: center;
                      color: var(--mi-normal-foreground-color);
                    `
                  }
                >
                  {p.title}
                </Link>
              )}
            </h3>
            <p
              className={css`
                color: var(--mi-light-foreground-color);
                text-transform: uppercase;
                font-size: var(--mi-font-size-small);
              `}
            >
              {new Date(p.publishedAt).toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
            </p>
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
              <MarkdownWrapper>
                {excerpt.map((text, i) => (
                  <p key={i}>{text}</p>
                ))}
              </MarkdownWrapper>
            </span>
          </div>
        </div>
      </Box>
    </PostContainer>
  );
};
export default PostCard;
