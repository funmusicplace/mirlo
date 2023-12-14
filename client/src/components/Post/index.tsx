import { css } from "@emotion/css";
import Button from "components/common/Button";
import { MetaCard } from "components/common/MetaCard";
import MarkdownContent from "components/common/MarkdownContent";
import React from "react";
import { useTranslation } from "react-i18next";
import { FaPen } from "react-icons/fa";
import { Link, useParams } from "react-router-dom";
import { useGlobalStateContext } from "state/GlobalState";
import usePublicObjectById from "utils/usePublicObjectById";
import { bp } from "../../constants";

export const pageMarkdownWrapper = css`
  margin-top: 2rem;
  max-width: var(--mi-container-medium);
  margin: auto;
  padding: var(--mi-side-paddings-xsmall);
  font-size: 18px;
`;

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
    <div className={pageMarkdownWrapper}>
      <div
        className={css`
          margin-top: 1rem;
          display: flex;
          justify-content: center;
          width: 100%;
          h1 {
            margin-bottom: 0.5rem;
          }

          @media (min-width: ${bp.medium}px) {
            font-size: 1.2rem;
            font-weight: 100;
            line-height: 1.5rem;
          }
        `}
      >
        <MetaCard
          title={`${post.title} by ${post.artist?.name}`}
          description={post.content.slice(0, 500)}
        />
        <div
          className={css`
            flex: 100%;
            max-width: 700px;
          `}
        >
          <div
            className={css`
              display: flex;
              justify-content: space-between;
            `}
          >
            <h1>{post.title}</h1>
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
              <Link
                to={`/${post.artist.urlSlug?.toLowerCase() ?? post.artistId}`}
              >
                {post.artist?.name}
              </Link>
            </em>
          )}
          <MarkdownContent
            content={post.content}
            className={css`
              padding-top: 1rem;
            `}
          />
        </div>
      </div>
    </div>
  );
};

export default Post;
