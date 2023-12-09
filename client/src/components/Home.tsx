import { css } from "@emotion/css";
import { bp } from "../constants";
import React from "react";
import { Link } from "react-router-dom";
import { useGlobalStateContext } from "state/GlobalState";
import api from "../services/api";
import Logo from "./common/Logo";
import { Trans, useTranslation } from "react-i18next";
import Releases from "./Releases";
import Overlay from "./common/Overlay";
import PostCard from "./common/PostCard";

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
              position: sticky;
              top: 0;
              background-color: var(--mi-normal-background-color);
              border-bottom: solid 1px var(--mi-lighter-foreground-color);
              padding: 0.5rem 0;
              z-index: +1;
              margin-bottom: 1rem;
              margin-top: 2em;
              line-height: 1em;

              @media screen and (max-width: ${bp.medium}px) {
                margin-bottom: 0.5rem;
              }
              @media screen and (max-width: ${bp.small}px) {
                font-size: 1.8rem;
              }
              @media screen and (min-width: ${bp.medium}px) {
                position: sticky;
                margin-bottom: 1rem;
                top: 55px;
              }
            `}
          >
            {t("latestCommunityPost")}
          </h1>
          <div
            className={css`
              margin-top: 1rem;
              display: flex;
              flex-wrap: wrap;
              justify-content: space-between;

              a {
                width: 32%;
              }

              @media screen and (max-width: ${bp.medium}px) {
                padding: 0rem !important;
                background: var(--mi-light-background-color);
              }

              @media screen and (max-width: ${bp.medium}px) {
                flex-direction: column;

                a {
                  width: 100%;
                }
              }
            `}
          >
            {posts.map((p) => (
              <Link
                to={`/post/${p.id}/`}
                className={css`
                  display: flex;
                  margin-bottom: 1.5rem;
                  border-radius: 5px;
                  background-color: var(--mi-darken-background-color);
                  filter: brightness(95%);
                  width: 100%;

                  :hover {
                    transition: 0.2s ease-in-out;
                    text-decoration: none;
                    background-color: rgba(50, 0, 0, 0.07);
                    filter: brightness(90%);
                  }

                  @media (prefers-color-scheme: dark) {
                    :hover {
                      filter: brightness(120%);
                      background-color: rgba(100, 100, 100, 0.2);
                    }
                  }
                `}
              >
                <Overlay width="100%" height="100%"></Overlay>
                <PostCard
                  width="100%"
                  height="350px"
                  dateposition="100%"
                  p={p}
                ></PostCard>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default Home;
