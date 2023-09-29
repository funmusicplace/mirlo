import { css } from "@emotion/css";
import React from "react";
import { Link } from "react-router-dom";
import { useGlobalStateContext } from "state/GlobalState";
import Button from "./common/Button";
import api from "../services/api";
import Box from "./common/Box";
import PostContent from "./common/PostContent";
// import Button from "./common/Button";
// import { FaArrowRight } from "react-icons/fa";

function Home() {
  const {
    state: { user },
  } = useGlobalStateContext();
  const [posts, setPosts] = React.useState<Post[]>([]);

  // const fetchAllPosts = React.useCallback(async () => {
  //   const fetched = await api.getMany<Post>("posts");
  //   setPosts(
  //     // FIXME: Maybe this should be managed by a filter on the API?
  //     fetched.results.filter((p) => !(p.forSubscribersOnly && p.content === ""))
  //   );
  // }, []);

  const userId = user?.id;

  const fetchPosts = React.useCallback(async () => {
    if (userId) {
      const fetched = await api.getMany<Post>(`users/${userId}/feed`);
      setPosts(fetched.results);
      // if (fetched.results.length === 0) {
      //   await fetchAllPosts();
      // }
    } else {
      // await fetchAllPosts();
    }
  }, [userId]);

  React.useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  return (
    <div className={css``}>
      {!user && (
        <div>
          <p
            className={css`
              font-size: 2rem;
              padding-bottom: 2rem;
              font-weight: bold;
              font-family: "Roboto Slab", serif;
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
          <span
            className={css`
              text-align: center;
            `}
          >
            Coming soon!
          </span>
          <a
            href="https://dashboard.mailerlite.com/forms/396303/100612617721087214/share"
            target="_blank"
            rel="noreferrer"
          >
            <Button
              className={css`
                margin-top: 1rem;
              `}
            >
              Want to stay in the loop? Sign up to our mailing list
            </Button>
          </a>
        </div>
      )}
      {user && (
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
