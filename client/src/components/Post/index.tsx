import { css } from "@emotion/css";
import PostContent from "components/common/PostContent";
import React from "react";
import { Link, useParams } from "react-router-dom";
import usePublicObjectById from "utils/usePublicObjectById";

const Post: React.FC = () => {
  const { postId } = useParams();
  const { object: post } = usePublicObjectById<Post>("posts", postId);

  if (!post) {
    return <>No post found</>;
  }

  return (
    <>
      <div
        className={css`
          display: flex;
          justify-content: space-between;
        `}
      >
        <h3>{post.title}</h3>
      </div>
      <em>
        by <Link to={`/artist/${post.artist.id}`}>{post.artist?.name}</Link>
      </em>
      <PostContent content={post.content} />
    </>
  );
};

export default Post;
