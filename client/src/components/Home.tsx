import React from "react";
import ReactMarkdown from "react-markdown";
import api from "../services/api";
import { useGlobalStateContext } from "../state/GlobalState";

function Home() {
  const {
    state: { user },
  } = useGlobalStateContext();
  const [posts, setPosts] = React.useState<Post[]>([]);

  const fetchPosts = React.useCallback(async () => {
    const fetched = await api.get<{ results: Post[] }>("posts");
    setPosts(fetched.results);
  }, []);

  React.useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  if (!user) {
    return null;
  }

  return (
    <div>
      {posts.map((p) => (
        <div key={p.id}>
          <h3>{p.title}</h3>
          <ReactMarkdown>{p.content}</ReactMarkdown>
        </div>
      ))}
    </div>
  );
}

export default Home;
