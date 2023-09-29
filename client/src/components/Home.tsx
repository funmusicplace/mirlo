import { css } from "@emotion/css";
import React from "react";
import { Link } from "react-router-dom";
import { useGlobalStateContext } from "state/GlobalState";
import Button from "./common/Button";
import api from "../services/api";
import Box from "./common/Box";
import PostContent from "./common/PostContent";
import Logo from "./common/Logo";
import { bp } from "../constants";
// import Button from "./common/Button";
// import { FaArrowRight } from "react-icons/fa";

function Home() {
  const {
    state: { user },
  } = useGlobalStateContext();
  const [posts, setPosts] = React.useState<Post[]>([]);

  const fetchAllPosts = React.useCallback(async () => {
    const fetched = await api.getMany<Post>("posts");
    setPosts(
      // FIXME: Maybe this should be managed by a filter on the API?
      fetched.results.filter((p) => !(p.forSubscribersOnly && p.content === ""))
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
          `}
        >
          <img
            alt="blackbird"
            src="/images/blackbird.png"
            className={css`
              width: 100%;
              margin-right: 3rem;
              display: none;
              transform: scaleX(-1);
              @media (min-width: ${bp.small}px) {
                display: inline-block;
              }
            `}
          />
          <div className={css``}>
            <Logo />
            <p
              className={css`
                margin-top: 1rem;
                font-size: 2rem;
                padding-bottom: 2rem;
                font-weight: bold;
              `}
            >
              Direct support for musicians. Buy their music. Collectively owned
              and managed.
            </p>
            {/* <Link to="signup">
            <Button
              className={css`
                margin-top: 1.5rem;
              `}
              endIcon={<FaArrowRight />}
            >
              Get started
            </Button>
          </Link> */}
            <a
              href="https://dashboard.mailerlite.com/forms/396303/100612617721087214/share"
              target="_blank"
              rel="noreferrer"
            >
              <Button className={css``}>Sign up to our mailing list</Button>
            </a>
          </div>
        </div>
      )}
      {user && posts.length > 0 && (
        <>
          <h2>Latest posts from the community:</h2>
          {posts.map((p) => (
            <Box
              key={p.id}
              className={css`
                margin-bottom: 1rem;

                h3 {
                  padding-bottom: 0.4rem;
                }
              `}
            >
              <h3>
                <Link to={`/post/${p.id}/`}>{p.title}</Link>
              </h3>
              {p.artist && (
                <em>
                  by{" "}
                  <Link to={`/${p.artist.urlSlug ?? p.artist.id}`}>
                    {p.artist?.name}
                  </Link>
                </em>
              )}
              <PostContent content={p.content} />
            </Box>
          ))}
        </>
      )}
    </div>
  );
}

export default Home;
