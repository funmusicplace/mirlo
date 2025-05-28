import { css } from "@emotion/css";
import { useTranslation } from "react-i18next";
import { NavLink, Outlet, useParams } from "react-router-dom";
import { bp } from "../../constants";

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
import Tabs from "components/common/Tabs";

function Label() {
  const { t } = useTranslation("translation", { keyPrefix: "label" });

  const { labelSlug } = useParams();

  if (!labelSlug) {
    return <div>{t("labelNotFound")}</div>;
  }

  const { data: label } = useQuery(queryLabelBySlug(labelSlug));

  const avatar = label?.userAvatar;

  if (!label) {
    return <div>{t("labelNotFound")}</div>;
  }

  const trackGroups = label.artistLabels?.reduce((acc, al) => {
    if (al.artist?.trackGroups) {
      acc.push(...al.artist.trackGroups);
    }
    return acc;
  }, [] as TrackGroup[]);

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
      <Tabs
        className={css`
          margin-bottom: 1rem !important;
        `}
      >
        <li>
          <NavLink to="roster">{t("roster")}</NavLink>
        </li>
        {trackGroups.length > 0 && (
          <li>
            <NavLink to="releases">{t("releases")}</NavLink>
          </li>
        )}
      </Tabs>
      <div
        className={css`
          display: flex;
          flex-direction: row;
          flex-wrap: wrap;
          padding: var(--mi-side-paddings-xsmall);
          margin-top: 3rem;
        `}
      >
        <Outlet />
      </div>
    </ArtistPageWrapper>
  );
}

export default Label;
