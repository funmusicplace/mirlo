import React from "react";
import { css } from "@emotion/css";
import { SectionHeader } from "./Home";
import WidthContainer from "components/common/WidthContainer";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { queryPosts } from "queries";
import PostGrid from "components/Post/PostGrid";

const Posts = () => {
  const { t } = useTranslation("translation", { keyPrefix: "home" });
  const response = useQuery(queryPosts({ take: 3 }));
  const { data: posts } = response;
  if (posts?.results?.length === 0 || posts === undefined) {
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
            `}
          >
            <PostGrid posts={posts?.results} ariaLabelledBy={headingId} />
          </div>
        </div>
      </WidthContainer>
    </>
  );
};

export default Posts;
