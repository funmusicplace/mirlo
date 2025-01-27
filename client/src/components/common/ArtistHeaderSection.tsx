import { css } from "@emotion/css";
import { bp } from "../../constants";
import { MetaCard } from "components/common/MetaCard";
import styled from "@emotion/styled";
import FollowArtist from "./FollowArtist";
import SpaceBetweenDiv from "./SpaceBetweenDiv";
import ArtistFormLinks from "components/ManageArtist/ArtistFormLinks";
import Avatar from "components/Artist/Avatar";
import ArtistFormLocation from "components/ManageArtist/ArtistFormLocation";
import ArtistHeaderDescription from "components/Artist/ArtistHeaderDescription";
import LoadingBlocks from "components/Artist/LoadingBlocks";
import { UpdateArtistBody, useUpdateArtistMutation } from "queries";
import React from "react";
import { useSnackbar } from "state/SnackbarContext";
import { useAuthContext } from "state/AuthContext";
import { ButtonLink } from "./Button";
import { FaEye, FaPen } from "react-icons/fa";
import { useTranslation } from "react-i18next";

export const ArtistTitle = styled.h1<{ artistAvatar: boolean }>`
  font-size: 2.4rem;
  line-height: 2.5rem;

  @media screen and (max-width: ${bp.medium}px) {
    font-size: 1.2rem;
    line-height: 1.4rem;
    padding-top: 0rem;
    padding-bottom: 0rem;
    ${(props) =>
      !props.artistAvatar
        ? "font-size: 1.3rem !important; line-height: 2rem;"
        : ""}
  }
`;

const Header = styled.div`
  display: flex;
  width: 100%;
  flex-direction: column;
  align-items: left;
  justify-content: space-between;
  flex-grow: 1;
  font-size: var(--mi-font-size-normal);

  @media screen and (max-width: ${bp.medium}px) {
    font-size: var(--mi-font-size-small);
    line-height: var(--mi-font-size-normal);
    border-radius: 0;
    padding: var(--mi-side-paddings-xsmall);
    margin-bottom: 0rem !important;
  }
`;

const HeaderWrapper = styled.div`
  display: flex;
  overflow: hidden;
  align-items: flex-end;
  justify-content: space-around;
  border-bottom: solid 1px var(--mi-light-foreground-color);

  @media screen and (max-width: ${bp.medium}px) {
    background: var(--mi-normal-background-color);
  }
`;

const DescriptionWrapperHasAvatar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
`;

const ArtistActions = styled.div`
  text-align: right;
  word-break: normal !important;
  display: flex;
  flex-direction: row;
  align-items: center;

  a {
    margin-left: 0.75rem;
  }
  padding-left: 1rem;

  @media screen and (max-width: ${bp.medium}px) {
    padding-left: 0.3rem;
    flex-direction: column;
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
          <div
            className={css`
              display: flex;
              padding-top: 1rem;
              ${artistAvatar ? "margin-bottom: 0.75rem;" : ""}
              align-items: center;

              @media screen and (max-width: ${bp.medium}px) {
                padding-top: 0rem;
                ${artistAvatar ? "margin-bottom: 0.5rem;" : ""}
              }
            `}
          >
            {artistAvatar && (
              <Avatar
                avatar={
                  artistAvatar?.sizes?.[300] + `?${artistAvatar?.updatedAt}`
                }
              />
            )}

            <div
              className={css`
                width: 100%;
                display: flex;
                ${artistAvatar ? "min-height: 85px; margin-left: 1rem;" : ""}
                flex-direction: column;
                justify-content: center;
                @media screen and (max-width: ${bp.medium}px) {
                  ${artistAvatar ? "min-height: 55px; margin-left: .5rem;" : ""}
                }
              `}
            >
              <div
                className={css`
                  width: 100%;
                `}
              >
                <SpaceBetweenDiv
                  className={css`
                    padding-bottom: 0 !important;
                    margin-bottom: 0rem !important;
                    @media screen and (max-width: ${bp.medium}px) {
                      margin: 0rem !important;
                    }
                  `}
                >
                  <div
                    className={css`
                      min-height: 50px;
                      display: flex;
                      align-items: center;
                      justify-content: space-between;
                      word-break: break-word;
                      width: 100%;
                      @media screen and (max-width: ${bp.medium}px) {
                        min-height: auto;
                      }
                    `}
                  >
                    <div
                      className={css`
                        display: flex;
                        flex-direction: column;
                        justify-content: center;
                        word-break: break-word;
                        width: 100%;
                      `}
                    >
                      <ArtistTitle artistAvatar={!!artistAvatar}>
                        {artist.name}
                      </ArtistTitle>

                      <ArtistFormLocation
                        isManage={!!isManage}
                        artist={artist}
                        onSubmit={handleSubmit}
                      />
                    </div>
                    <ArtistActions>
                      {!isManage && <FollowArtist artistId={artist.id} />}
                      {isManage && (
                        <div>
                          <ButtonLink
                            size="big"
                            rounded
                            collapsible
                            startIcon={<FaPen />}
                            to={`/manage/artists/${artist.id}/customize`}
                            className={css`
                              margin-bottom: 0.25rem;
                            `}
                          >
                            {t("editDetails")}
                          </ButtonLink>
                          <ButtonLink
                            to={`/${artist?.urlSlug?.toLowerCase() ?? artist?.id}`}
                            size="big"
                            rounded
                            collapsible
                            startIcon={<FaEye />}
                            disabled={!artist}
                            className={css`
                              margin-left: 0.5rem;
                              margin-bottom: 0.25rem;
                            `}
                          >
                            {t("viewLive")}
                          </ButtonLink>
                        </div>
                      )}
                    </ArtistActions>
                  </div>
                </SpaceBetweenDiv>
              </div>
              {!artistAvatar && (
                <div
                  className={css`
                    width: 100%;
                    ${!artistAvatar ? "padding-top: .75rem;" : ""}
                  `}
                >
                  <ArtistHeaderDescription
                    isManage={!!isManage}
                    artist={artist}
                    onSubmit={handleSubmit}
                  />
                </div>
              )}
            </div>
          </div>
          {artistAvatar && (
            <DescriptionWrapperHasAvatar>
              <ArtistHeaderDescription
                isManage={!!isManage}
                artist={artist}
                onSubmit={handleSubmit}
              />
            </DescriptionWrapperHasAvatar>
          )}
        </Header>
      </HeaderWrapper>
      <div
        className={css`
          display: flex;
          justify-content: flex-end;
          padding-top: 0.5rem;
          @media screen and (max-width: ${bp.medium}px) {
            display: none;
          }
        `}
      >
        <ArtistFormLinks
          isManage={!!isManage}
          artist={artist}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
};

export default ArtistHeaderSection;
