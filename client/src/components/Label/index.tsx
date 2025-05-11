import { css } from "@emotion/css";
import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { API_ROOT } from "../../constants";
import { bp } from "../../constants";

import api from "../../services/api";
import Button, { ButtonLink } from "../common/Button";
import WidthContainer from "components/common/WidthContainer";
import { useAuthContext } from "state/AuthContext";
import styled from "@emotion/styled";
import UploadArtistImage from "components/ManageArtist/UploadArtistImage";
import { useQuery } from "@tanstack/react-query";
import { queryLabelBySlug } from "queries";
import { ArtistPageWrapper } from "components/ManageArtist/ManageArtistContainer";
import {
  ArtistTitle,
  ArtistTitleText,
  ArtistTitleWrapper,
  AvatarWrapper,
  Header,
  HeaderWrapper,
} from "components/common/ArtistHeaderSection";
import Avatar from "components/Artist/Avatar";
import SpaceBetweenDiv from "components/common/SpaceBetweenDiv";
import TrackgroupGrid from "components/common/TrackgroupGrid";
import ArtistSquare from "components/Artist/ArtistSquare";

function Label() {
  const { t } = useTranslation("translation", { keyPrefix: "label" });
  const { user, refreshLoggedInUser } = useAuthContext();

  const { labelSlug } = useParams();

  if (!labelSlug) {
    return <div>{t("labelNotFound")}</div>;
  }

  const { data: label, refetch } = useQuery(queryLabelBySlug(labelSlug));

  const avatar = label?.userAvatar;

  if (!label) {
    return <div>{t("labelNotFound")}</div>;
  }

  return (
    <ArtistPageWrapper>
      <HeaderWrapper>
        <Header>
          <AvatarWrapper artistAvatar={!!avatar}>
            {avatar && (
              <Avatar avatar={avatar?.sizes?.[300] + `?${avatar?.updatedAt}`} />
            )}
            <ArtistTitleWrapper artistAvatar={!!avatar}>
              <SpaceBetweenDiv
                className={css`
                  padding-bottom: 0 !important;
                  margin-bottom: 0rem !important;
                  @media screen and (max-width: ${bp.medium}px) {
                    margin: 0rem !important;
                  }
                `}
              >
                <ArtistTitleText>
                  <div
                    className={css`
                      display: flex;
                      flex-direction: column;
                      justify-content: center;
                      word-break: break-word;
                      width: 100%;
                    `}
                  >
                    <ArtistTitle artistAvatar={!!avatar}>
                      {label.name}
                    </ArtistTitle>
                  </div>
                </ArtistTitleText>
              </SpaceBetweenDiv>
            </ArtistTitleWrapper>
          </AvatarWrapper>
        </Header>
      </HeaderWrapper>
      <div
        className={css`
          display: flex;
          flex-direction: row;
          flex-wrap: wrap;
          padding: var(--mi-side-paddings-xsmall);
          margin-top: 3rem;
        `}
      >
        <h2>Roster</h2>
        <TrackgroupGrid gridNumber="4" as="ul" role="list">
          {label?.artistLabels?.map((al) => (
            <ArtistSquare key={al.artist.id} artist={al.artist} />
          ))}
        </TrackgroupGrid>
      </div>
    </ArtistPageWrapper>
  );
}

export default Label;
