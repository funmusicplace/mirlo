import { css } from "@emotion/css";
import { bp } from "../constants";
import React from "react";
import { Link } from "react-router-dom";
import { useGlobalStateContext } from "state/GlobalState";
import api from "../services/api";
import Box from "./common/Box";
import Logo from "./common/Logo";
import { Trans, useTranslation } from "react-i18next";
import Releases from "./Releases";

function Home() {
  const {
    state: { user },
  } = useGlobalStateContext();
  const [posts, setPosts] = React.useState<Post[]>([]);
  const { t } = useTranslation("translation", { keyPrefix: "home" });

  const fetchAllPosts = React.useCallback(async () => {
    const fetched = await api.getMany<Post>("posts");
    setPosts(
      // FIXME: Maybe this should be managed by a filter on the API?
      fetched.results.filter((p) => !(p.isPublic && p.content === ""))
    );
  }, []);

  const userId = user?.id;

  const fetchPosts = React.useCallback(async () => {
    if (userId) {
      const fetched = await api.getMany<Post>(`users/${userId}/feed`);
      setPosts(fetched.results);
      if (fetched.results.length === 0) {
        await fetchAllPosts();
      }
    } else {
      // await fetchAllPosts();
    }
  }, [userId, fetchAllPosts]);

  React.useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  return (
    <div
      className={
        !userId
          ? css`
              flex-grow: 1;
              display: flex;
              align-items: center;
              flex-grow: 1;
            `
          : css`
              min-height: calc(100vh - 350px);
              width: 100%;
            `
      }
    >
      {!user && (
        <div
          className={css`
            display: flex;
            align-items: center;
            justify-content: center;
          `}
        >
          <div
            className={css`
              display: none;

              @media (min-width: 768px) {
                display: block;
                background-image: url("/images/blackbird-light.webp");
                background-size: contain;
                background-repeat: no-repeat;
                width: 370px;
                height: 285px;
                margin-right: 60px;
              }

              @media (min-width: 768px) and (prefers-color-scheme: dark) {
                background-image: url("/images/blackbird-dark.webp");
              }
            `}
          />
          <div
            className={css`
              display: flex;
              flex-direction: column;
              gap: 48px;
              max-width: 500px;
            `}
          >
            <Logo />
            <div
              className={css`
                display: flex;
                flex-direction: column;
                gap: 24px;
              `}
            >
              <h1
                className={css`
                  font-size: 1.75rem;
                  font-weight: 400;
                  line-height: 1.25;
                `}
              >
                {t("support")}
              </h1>
              <div
                className={css`
                  display: flex;
                  gap: 16px;
                `}
              >
                <a
                  href="https://dashboard.mailerlite.com/forms/396303/100612617721087214/share"
                  target="_blank"
                  rel="noreferrer"
                  className={css`
                    display: block;
                    height: 51px;
                    border-radius: 9999px;
                    font-weight: bold;
                    font-size: 1rem;
                    align-items: center;
                    display: inline-flex;
                    line-height: 1rem;
                    padding: 1rem;
                    text-decoration: none;
                    text-align: center;

                    &:hover {
                      text-decoration: underline;
                    }

                    background-color: var(--mi-pink);
                    color: var(--mi-white);
                  `}
                >
                  {t("mailingList")}
                </a>
                <Link
                  to="/login"
                  className={css`
                    display: block;
                    height: 51px;
                    border-radius: 9999px;
                    font-weight: bold;
                    font-size: 1rem;
                    align-items: center;
                    display: inline-flex;
                    line-height: 1rem;
                    padding: 1rem;
                    text-decoration: none;
                    text-align: center;
                    &:hover {
                      text-decoration: underline;
                    }

                    background-color: var(--mi-black);
                    color: var(--mi-white);
                    @media (prefers-color-scheme: dark) {
                      background-color: var(--mi-white);
                      color: var(--mi-black);
                    }
                  `}
                >
                  {t("logIn")}
                </Link>
              </div>
              <p
                className={css`
                  font-size: 0.875rem;
                  line-height: 1.5;
                `}
              >
                <Trans
                  t={t}
                  i18nKey="mirloConstruction"
                  components={{
                    // eslint-disable-next-line jsx-a11y/anchor-has-content
                    about: <a href="/pages/about"></a>,
                    // eslint-disable-next-line jsx-a11y/anchor-has-content
                    faq: <a href="/pages/faq"></a>,
                    github: (
                      // eslint-disable-next-line jsx-a11y/anchor-has-content
                      <a href="https://github.com/funmusicplace/mirlo/"></a>
                    ),
                    // eslint-disable-next-line jsx-a11y/anchor-has-content,
                    discord: <a href="https://discord.gg/VjKq26raKX"></a>,
                    // eslint-disable-next-line jsx-a11y/anchor-has-content
                    email: <a href="mailto:mirlodotspace@proton.me"></a>,
                  }}
                />
              </p>
            </div>
          </div>
        </div>
      )}
      {user && <Releases />}
      {user && posts.length > 0 && (
        <>
          <h1
            className={css`
              margin-bottom: 1rem;
              margin-top: 2em;
              line-height: 1em;
              @media screen and (max-width: ${bp.medium}px) {
                margin-bottom: 0.5rem;
              }
              @media screen and (min-width: ${bp.medium}px) {
                position: sticky;
                padding-bottom: 1rem;
                margin-bottom: 1rem;
                top: 55px;
                background-color: var(--mi-normal-background-color);
                z-index: +1;
                border-bottom: solid 1px var(--mi-lighter-foreground-color);
              }
            `}
          >
            {t("latestCommunityPost")}
          </h1>
          {posts.map((p) => (
            <Link
              to={`/post/${p.id}/`}
              className={css`
                width: 100%;
                :hover {
                  text-decoration: none !important;
                  filter: brightness(90%);
                }
                @media (prefers-color-scheme: dark) {
                  :hover {
                    filter: brightness(140%);
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
                    align-items: flex-start;
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
                    @media (prefers-color-scheme: dark) {
                    :hover {
                      background-color: var(--mi-lighten-background-color);
                      transition: 0.2s ease-in-out;
                    }
                  `}
                >
                  <div
                    className={css`
                      padding-bottom: 1rem;
                      width: 100%;
                    `}
                  >
                    {/* <h5>{p.title}</h5> */}
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
                    {p.artist && (
                      <em>
                        by{" "}
                        <Link to={`/${p.artist.urlSlug ?? p.artist.id}`}>
                          {p.artist?.name}
                        </Link>
                      </em>
                    )}
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
        </>
      )}
    </div>
  );
}

export default Home;
