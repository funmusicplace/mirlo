import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import SpaceBetweenDiv from "components/common/SpaceBetweenDiv";
import ManageSectionWrapper from "../ManageSectionWrapper";
import { css } from "@emotion/css";
import BackToArtistLink from "../BackToArtistLink";
import PostForm from "./PostForm";
import { bp } from "../../../constants";
import { useQuery } from "@tanstack/react-query";
import { queryManagedArtist, queryManagedPost } from "queries";

const ManagePost: React.FC<{}> = () => {
  const { t } = useTranslation("translation", { keyPrefix: "managePost" });
  const navigate = useNavigate();

  const { artistId } = useParams();

  const { data: artist } = useQuery(queryManagedArtist(Number(artistId)));

  const reload = React.useCallback(async (postId?: number) => {
    if (postId) {
      navigate(`/manage/artists/${artistId}/post/${postId}`);
    }
  }, []);

  return (
    <ManageSectionWrapper
      className={css`
        padding-top: 1rem !important;
        max-width: var(--mi-container-medium);
        margin: 0 auto;
      `}
    >
      <div
        className={css`
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          padding-top: 1rem;

          @media screen and (max-width: ${bp.medium}px) {
            padding-top: 0.5rem;
          }
        `}
      >
        <BackToArtistLink />
        <SpaceBetweenDiv>
          <h1
            className={css`
              display: flex;
              align-items: center;
            `}
          >
            {t("managePost")}
          </h1>
        </SpaceBetweenDiv>
      </div>
      {artist && <PostForm {...{ reload, artist }} />}
    </ManageSectionWrapper>
  );
};

export default ManagePost;
