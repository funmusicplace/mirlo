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
import styled from "@emotion/styled";
import WidthContainer from "./common/WidthContainer";

export const SectionHeader = styled.div<{ userId?: number }>`
  position: sticky !important;
  padding-bottom: 0;
  line-height: 1rem;
  background-color: var(--mi-normal-background-color);
  z-index: 5;
  margin-top: 0.25rem;
  ${(props) =>
    !props.userId ? "top: -0.1rem; padding: .85rem 0 .65rem 0;" : ""}
  h5 {
    text-transform: uppercase;
    margin: var(--mi-side-paddings-xsmall);
    font-weight: normal;
    color: var(--mi-pink);
    padding-bottom: 0 !important;
  }

  @media (prefers-color-scheme: dark) {
    background-color: var(--mi-normal-background-color);
    h5 {
      color: pink;
    }
  }

  @media screen and (max-width: ${bp.medium}px) {
    top: -0.1rem;
    h5 {
      margin: var(--mi-side-paddings-xsmall);
    }
  }
`;

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
            width: 100%;
            padding: var(--mi-side-paddings-xsmall);
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

                    background-color: var(--mi-secondary-color);
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
      <div
        className={css`
          padding-top: 1rem;
        `}
      >
        {user && <Releases />}
        {user && posts.length > 0 && (
          <>
            <div
              className={css`
                padding-top: 1rem;

                background-color: var(--mi-light-background-color);
              `}
            >
              <SectionHeader
                className={css`
                  background-color: var(--mi-light-background-color) !important;
                `}
              >
                <WidthContainer variant="big" justify="center">
                  <h5>{t("latestCommunityPost")}</h5>
                </WidthContainer>
              </SectionHeader>

              <div
                className={css`
                  a {
                    color: var(--mi-normal-foreground-color);
                  }
                `}
              >
                <WidthContainer variant="big" justify="center">
                  <div
                    className={css`
                      margin: var(--mi-side-paddings-xsmall);
                      margin-top: 1rem;
                      display: flex;
                      flex-wrap: wrap;
                      justify-content: space-between;

                      a {
                        width: 32%;
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
                </WidthContainer>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Home;
