import { css } from "@emotion/css";
import Button from "components/common/Button";
import { MetaCard } from "components/common/MetaCard";
import PostContent from "components/common/PostContent";
import React from "react";
import { useTranslation } from "react-i18next";
import { FaPen } from "react-icons/fa";
import { Link, useParams } from "react-router-dom";
import { useGlobalStateContext } from "state/GlobalState";
import usePublicObjectById from "utils/usePublicObjectById";

const Post: React.FC = () => {
  const { t } = useTranslation("translation", { keyPrefix: "post" });

  const {
    state: { user },
  } = useGlobalStateContext();
  const { postId } = useParams();
  const { object: post } = usePublicObjectById<Post>("posts", postId);

  if (!post) {
    return <>No post found</>;
  }

  const ownedByUser = post.artist?.userId === user?.id;

  return (
    <div
      className={css`
        margin-top: 1rem;
        width: 100%;
      `}
    >
      <MetaCard
        title={`${post.title} by ${post.artist?.name}`}
        description={post.content.slice(0, 500)}
      />

      <div
        className={css`
          display: flex;
          justify-content: space-between;
        `}
      >
        <h3>{post.title}</h3>
        {ownedByUser && (
          <Link to={`/manage/artists/${post.artist?.id}`}>
            <Button compact startIcon={<FaPen />}>
              {t("edit")}
            </Button>
          </Link>
        )}
      </div>
      {post.artist && (
        <em>
          by{" "}
          <Link to={`/${post.artist.urlSlug?.toLowerCase() ?? post.artistId}`}>
            {post.artist?.name}
          </Link>
        </em>
      )}
      <PostContent content={post.content} />
    </div>
  );
};

export default Post;
