import { css } from "@emotion/css";
import React from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import Box from "./common/Box";
import PostContent from "./common/PostContent";

function Home() {
  const [posts, setPosts] = React.useState<Post[]>([]);

  const fetchPosts = React.useCallback(async () => {
    const fetched = await api.getMany<Post>("posts");
    setPosts(
      // FIXME: Maybe this should be managed by a filter on the API?
      fetched.results.filter((p) => !(p.forSubscribersOnly && p.content === ""))
    );
  }, []);

  React.useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  return (
    <div>
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
          <em>
            by <Link to={`/artist/${p.artist.id}`}>{p.artist?.name}</Link>
          </em>
          <PostContent content={p.content} />
        </Box>
      ))}
    </div>
  );
}

export default Home;
