import React from "react";
import { css } from "@emotion/css";
import { SectionHeader } from "./Home";
import WidthContainer from "components/common/WidthContainer";
import { useTranslation } from "react-i18next";
import PostCard from "components/common/PostCard";
import { PostGrid } from "components/Artist/ArtistPosts";
import { useQuery } from "@tanstack/react-query";
import { queryPosts } from "queries";

const Posts = () => {
  const { t } = useTranslation("translation", { keyPrefix: "home" });
  const { data: posts } = useQuery(queryPosts({ take: 3 }));

  if (posts?.results?.length === 0) {
    return null;
  }

  const id = React.useId();
  const headingId = `${id}-community-posts`;

  return (
    <>
      <WidthContainer variant="big">
        <div
          className={css`
            padding-top: 1rem;
          `}
        >
          <SectionHeader className={css``}>
            <h2 className="h5 section-header__heading" id={headingId}>
              {t("latestCommunityPost")}
            </h2>
          </SectionHeader>

          <div
            className={css`
              margin: var(--mi-side-paddings-xsmall);
              a {
                color: var(--mi-normal-foreground-color);
              }
            `}
          >
            <PostGrid as="ul" role="list" aria-labelledby={headingId}>
              {posts?.results?.map((p) => (
                <li key={p.id}>
                  <PostCard p={p} />
                </li>
              ))}
            </PostGrid>
          </div>
        </div>
      </WidthContainer>
    </>
  );
};

export default Posts;
