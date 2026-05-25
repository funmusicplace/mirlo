import { css } from "@emotion/css";
import styled from "@emotion/styled";
import ArtistHeaderActionsStrip from "components/Artist/ArtistHeaderActionsStrip";
import Avatar from "components/Artist/Avatar";
import LoadingBlocks from "components/Artist/LoadingBlocks";
import { MetaCard } from "components/common/MetaCard";
import ArtistFormLocation from "components/ManageArtist/ArtistFormLocation";
import { UpdateArtistBody, useUpdateArtistMutation } from "queries";
import React from "react";
import { useTranslation } from "react-i18next";
import { useAuthContext } from "state/AuthContext";
import { useSnackbar } from "state/SnackbarContext";
import { useFitTitle } from "utils/useFitTitle";

import { between, bp } from "../../constants";

import FollowArtist from "./FollowArtist";
import SpaceBetweenDiv from "./SpaceBetweenDiv";

export const ArtistTitle = styled.h1<{ artistAvatar: boolean }>`
  font-size: calc(2.4rem * var(--page-scale, 1) * var(--fit-scale, 1));
  line-height: 1.05;
  padding-bottom: 0.1em;

  @media screen and (min-width: ${Number(bp.medium) + 1}px) {
    white-space: nowrap;
    overflow-x: clip;

    &[data-fit-overflow="true"] {
      white-space: normal;
      overflow-x: visible;
    }
  }

  @media screen and (max-width: ${bp.medium}px) {
    font-size: calc(1.2rem * var(--fit-scale, 1));
    line-height: 1.4rem;
    padding-top: 0rem;
    padding-bottom: 0rem;
    ${(props) =>
      !props.artistAvatar
        ? "font-size: calc(1.3rem * var(--fit-scale, 1)) !important; line-height: 2rem;"
        : ""}
  }
`;

export const Header = styled.div`
  display: flex;
  width: 100%;
  flex-direction: column;
  align-items: left;
  justify-content: space-between;
  flex-grow: 1;
  font-size: var(--mi-font-size-normal);

  @media screen and (max-width: ${bp.xlarge}px) {
    font-size: var(--mi-font-size-small);
  }

  @media screen and (max-width: ${bp.medium}px) {
    font-size: var(--mi-font-size-small);
    line-height: var(--mi-font-size-normal);
    border-radius: 0;
    padding: var(--mi-side-paddings-xsmall);
    margin-bottom: 0rem !important;
  }
`;

export const AvatarWrapper = styled.div<{ artistAvatar?: boolean }>`
  display: flex;
  padding-top: calc(1rem * var(--page-scale, 1));
  align-items: center;

  @media screen and (max-width: ${bp.medium}px) {
    padding-top: 0rem;
    ${(props) => (props.artistAvatar ? "margin-bottom: 0rem;" : "")}
  }
`;

export const ArtistTitleWrapper = styled.div<{ artistAvatar?: boolean }>`
  width: 100%;
  min-width: 0;
  display: flex;
  ${(props) =>
    props.artistAvatar
      ? "min-height: calc(85px * var(--page-scale, 1)); margin-left: 1rem;"
      : ""}
  flex-direction: column;
  justify-content: center;
  @media screen and (max-width: ${bp.medium}px) {
    ${(props) =>
      props.artistAvatar ? "min-height: 55px; margin-left: .5rem;" : ""}
  }
`;

export const ArtistTitleText = styled.div`
  min-height: calc(50px * var(--page-scale, 1));
  display: flex;
  align-items: center;
  justify-content: space-between;
  word-break: break-word;
  width: 100%;
  gap: 1.5rem;
  @media screen and (max-width: ${bp.medium}px) {
    min-height: auto;
    gap: 1rem;
  }
`;

export const HeaderWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: space-around;
  border-bottom: solid 1px var(--mi-button-color);

  @media screen and (max-width: ${bp.medium}px) {
    gap: 0.5rem;
    border-bottom-color: color-mix(
      in srgb,
      var(--mi-button-color) 50%,
      transparent
    );
  }
`;

const ArtistHeaderSection: React.FC<{
  artist: Artist | undefined;
  isLoading: boolean;
  isManage: boolean;
}> = ({ artist, isLoading, isManage }) => {
  const artistAvatar = artist?.avatar;
  const { t } = useTranslation("translation", { keyPrefix: "manageArtist" });

  const { user } = useAuthContext();
  const { mutateAsync: updateArtist } = useUpdateArtistMutation();
  const snackbar = useSnackbar();
  const titleRef = useFitTitle<HTMLHeadingElement>({ deps: [artist?.name] });

  const handleSubmit = React.useCallback(
    async (data: UpdateArtistBody) => {
      if (user && artist) {
        await updateArtist({
          userId: user.id,
          artistId: artist.id,
          body: data,
        }).catch(() =>
          snackbar("Error saving your changes", { type: "warning" })
        );
      }
    },
    [user, artist, updateArtist, snackbar]
  );

  if (!artist && isLoading) {
    return <LoadingBlocks rows={1} />;
  } else if (!artist) {
    return null;
  }

  return (
    <div
      className={css`
        @media screen and (max-width: ${bp.medium}px) {
          padding-top: 0.5rem;
        }
      `}
    >
      <MetaCard
        title={artist.name}
        description={artist.bio}
        image={artistAvatar?.sizes?.[500] ?? artistAvatar?.sizes?.[1200]}
      />
      <HeaderWrapper>
        <Header>
          <AvatarWrapper artistAvatar={!!artistAvatar}>
            {artistAvatar && (
              <Avatar
                avatar={
                  artistAvatar?.sizes?.[300] + `?${artistAvatar?.updatedAt}`
                }
              />
            )}

            <ArtistTitleWrapper artistAvatar={!!artistAvatar}>
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
                      flex: 1 1 auto;
                      min-width: 0;
                    `}
                  >
                    <ArtistTitle artistAvatar={!!artistAvatar} ref={titleRef}>
                      {artist.name}
                    </ArtistTitle>
                    <div className="flex items-center gap-2 min-w-0">
                      {artist.isLabelProfile && (
                        <>
                          <span className="max-md:hidden text-(--mi-button-color)">
                            {artist.properties?.titles?.groupName ?? t("label")}
                          </span>
                          {artist.properties?.titles?.groupName && (
                            <span className="max-md:hidden opacity-50">-</span>
                          )}
                        </>
                      )}
                      <ArtistFormLocation
                        isManage={!!isManage}
                        artist={artist}
                        onSubmit={handleSubmit}
                      />
                    </div>{" "}
                    {artist.shortDescription && (
                      <div
                        className={css`
                          font-size: var(--mi-font-size-small);
                          line-height: 1.2;
                          margin-top: 0.25rem;
                          @media ${between(bp.medium, bp.xlarge)} {
                            margin-top: 0;
                          }
                          @media screen and (max-width: ${bp.medium}px) {
                            display: none;
                          }
                        `}
                      >
                        {artist.shortDescription}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-row items-center gap-1 shrink-0 text-right break-normal!">
                    {!isManage && <FollowArtist artistId={artist.id} />}
                  </div>
                </ArtistTitleText>
              </SpaceBetweenDiv>
            </ArtistTitleWrapper>
          </AvatarWrapper>
        </Header>
        {!artistAvatar && (
          <div
            className={css`
              display: block;
              height: 1rem;
            `}
          />
        )}
        <div className="w-full flex flex-row items-center justify-end pb-2 max-md:py-1 max-md:border-t max-md:border-(--mi-button-color)/50">
          <ArtistHeaderActionsStrip
            artist={artist}
            isManage={!!isManage}
            onSubmit={handleSubmit}
          />
        </div>
      </HeaderWrapper>
    </div>
  );
};

export default ArtistHeaderSection;
