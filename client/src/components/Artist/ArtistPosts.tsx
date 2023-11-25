import { css } from "@emotion/css";
import React from "react";
import { useTranslation } from "react-i18next";
import { bp } from "../../constants";
import { Link } from "react-router-dom";
import Box from "components/common/Box";
import PostCard from "components/common/PostCard";

const ArtistPosts: React.FC<{ artist: Artist }> = ({ artist }) => {
  const { t } = useTranslation("translation", { keyPrefix: "artist" });

  if (!artist || artist.trackGroups.length === 0) {
    return null;
  }

  return (
    <div>
      <h2
        className={css`
          margin-bottom: 0rem;
        `}
      >
        {t("updates")}
      </h2>
      <div
        className={css`
          display: flex;
          flex-direction: column;
          align-items: center;

          a:hover {
            text-decoration: none !important;
          }

          @media screen and (max-width: ${bp.medium}px) {
            padding: 0rem !important;
            background: var(--mi-light-background-color);
          }
        `}
      >
        <div
          className={css`
            padding-bottom: 0.7rem;
          `}
        >
          {artist.posts?.length === 0 && <>{t("noUpdates")}</>}
        </div>
        {artist.posts?.map((p) => (
          <Link
            to={`/post/${p.id}/`}
            key={p.id}
            className={css`
              width: 100%;
              :hover {
                text-decoration: none !important;
                filter: brightness(90%);
              }
              @media (prefers-color-scheme: dark) {
                :hover {
                  filter: brightness(110%);
                }
              }
            `}
          >
            <Box
              key={p.id}
              className={css`
                border: solid 1px grey;
                margin-bottom: 0.5rem !important;
                padding: 0 !important;
                justify-content: space-between;
                @media screen and (max-width: ${bp.medium}px) {
                  width: 100% !important;
                }
                @media screen and (max-width: ${bp.small}px) {
                  font-size: var(--mi-font-size-small) !important;
                }
              `}
            >
              <div
                className={css`
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  padding: 1rem;
                  margin: 0;
                  width: 100%;
                  overflow: hidden;
                  transition: 0.2s ease-in-out;
                  background-color: var(--mi-light-background-color);

                  :hover {
                    background-color: var(--mi-darken-background-color);
                    transition: 0.2s ease-in-out;
                  }
                `}
              >
                <div
                  className={css`
                    padding-bottom: 0.5rem;
                  `}
                >
                  {/* <h5>{p.title}</h5> */}

                  <h4
                    className={css`
                      padding-bottom: 0.3rem;
                      text-align: center;
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
                  {p.artist && (
                    <em>
                      by{" "}
                      <Link to={`/${p.artist.urlSlug ?? p.artist.id}`}>
                        {p.artist?.name}
                      </Link>
                    </em>
                  )}
                  <span
                    className={css`
                      color: grey;
                    `}
                  >
                    {new Date(p.publishedAt).toLocaleDateString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                </div>

                <div
                  className={css`
                    width: 100%;
                  `}
                >
                  <span
                    className={css`
                      white-space: nowrap;
                      display: block;
                      overflow: hidden;
                      text-overflow: ellipsis;
                      color: var(--mi-normal-foreground-color);
                    `}
                  >
                    {/* <MarkdownContent content={p.content} />*/}
                    {p.content}
                  </span>
                </div>
                {/*<div
                  className={css`
                    color: var(--mi-normal-background-color) !important;
                    text-align: center;
                    width: 20%;
                    height: 100%;
                    padding: 0.2rem;
                    transition: 0.2s ease-in-out;
                  `}
                  >
                  read more
                </div>*/}
              </div>
            </Box>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default ArtistPosts;
