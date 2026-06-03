import { css } from "@emotion/css";
import styled from "@emotion/styled";
import { ArtistButtonLink } from "components/Artist/ArtistButtons";
import ArtistHeaderActionsStrip from "components/Artist/ArtistHeaderActionsStrip";
import Avatar from "components/Artist/Avatar";
import LoadingBlocks from "components/Artist/LoadingBlocks";
import { MetaCard } from "components/common/MetaCard";
import ArtistFormLabel from "components/ManageArtist/ArtistFormLabel";
import ArtistFormLocation from "components/ManageArtist/ArtistFormLocation";
import { UpdateArtistBody, useUpdateArtistMutation } from "queries";
import React from "react";
import { useTranslation } from "react-i18next";
import { useAuthContext } from "state/AuthContext";
import { useSnackbar } from "state/SnackbarContext";
import { getArtistUrl } from "utils/artist";
import { useFitTitle } from "utils/useFitTitle";

import { bp } from "../../constants";

import FollowArtist from "./FollowArtist";

export const ArtistTitle = styled.h1<{ artistAvatar: boolean }>`
  font-size: calc(2.4rem * var(--page-scale, 1) * var(--fit-scale, 1));
  font-weight: 600;
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

const HeaderGrid = styled.div<{ hasBackground: boolean; hasAvatar: boolean }>`
  display: grid;
  grid-template-columns: ${(props) =>
    props.hasAvatar ? "auto minmax(0, 1fr) auto" : "minmax(0, 1fr) auto"};
  align-items: center;
  column-gap: 1rem;
  row-gap: 0.5rem;
  border-bottom: solid 1px var(--mi-button-color);
  grid-template-areas: ${(props) =>
    props.hasAvatar
      ? `"avatar identity follow" "strip strip strip"`
      : `"identity follow" "strip strip"`};

  @media screen and (max-width: ${bp.medium}px) {
    padding: var(--mi-side-paddings-xsmall);
    border-bottom-color: color-mix(
      in srgb,
      var(--mi-button-color) 50%,
      transparent
    );
  }

  @media screen and (min-width: ${Number(bp.medium) + 1}px) {
    padding-top: calc(
      ${(props) => (props.hasBackground ? "1" : "0.5")}rem *
        var(--page-scale, 1)
    );
    grid-template-areas: ${(props) =>
      props.hasAvatar
        ? `"avatar identity follow" "pill pill strip"`
        : `"identity follow" "pill strip"`};
  }
`;

const AvatarWrapper = styled.div`
  grid-area: avatar;
  display: flex;
  align-items: center;
`;

const IdentityWrapper = styled.div`
  grid-area: identity;
  display: flex;
  flex-direction: column;
  min-width: 0;
`;

const FollowWrapper = styled.div`
  grid-area: follow;
  justify-self: end;
`;

const PillWrapper = styled.div`
  grid-area: pill;
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  min-width: 0;

  @media screen and (max-width: ${bp.medium}px) {
    display: none;
  }
`;

const StripWrapper = styled.div<{ pulledUp: boolean }>`
  grid-area: strip;
  display: flex;
  justify-content: flex-end;
  padding-bottom: 0.5rem;

  @media screen and (min-width: ${Number(bp.medium) + 1}px) {
    justify-self: end;
    ${(props) => (props.pulledUp ? "margin-top: -1rem;" : "")}
  }

  @media screen and (max-width: ${bp.medium}px) {
    margin-left: -0.5rem;
    margin-right: -0.5rem;
    padding-top: 0.25rem;
    padding-bottom: 0.25rem;
    border-top: 1px solid
      color-mix(in srgb, var(--mi-button-color) 50%, transparent);
  }
`;

const ArtistHeaderSection: React.FC<{
  artist: Artist | undefined;
  isLoading: boolean;
  isManage: boolean;
}> = ({ artist, isLoading, isManage }) => {
  const artistAvatar = artist?.avatar;

  const { user } = useAuthContext();
  const { mutateAsync: updateArtist } = useUpdateArtistMutation();
  const snackbar = useSnackbar();
  const titleRef = useFitTitle<HTMLHeadingElement>({ deps: [artist?.name] });
  const { t } = useTranslation("translation", { keyPrefix: "artist" });

  const displayedLabelArtist = React.useMemo(() => {
    if (!artist || artist.isLabelProfile) return null;
    const match = (artist.artistLabels ?? []).find(
      (al) =>
        al.isDisplayedOnArtistPage && al.isArtistApproved && al.isLabelApproved
    );
    return match?.labelUser.artists?.[0] ?? null;
  }, [artist]);

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
      <HeaderGrid
        hasBackground={!!artist.background?.sizes}
        hasAvatar={!!artistAvatar}
      >
        {artistAvatar && (
          <AvatarWrapper>
            <Avatar
              avatar={
                artistAvatar?.sizes?.[300] + `?${artistAvatar?.updatedAt}`
              }
            />
          </AvatarWrapper>
        )}

        <IdentityWrapper>
          <ArtistTitle
            className="min-w-0"
            artistAvatar={!!artistAvatar}
            ref={titleRef}
          >
            {artist.name}
          </ArtistTitle>
          <div className="flex items-baseline gap-2 min-w-0 max-md:text-sm">
            {artist.isLabelProfile && artist.properties?.titles?.groupName && (
              <>
                <span className="max-md:hidden text-(--mi-button-color)">
                  {artist.properties.titles.groupName}
                </span>
                <span className="max-md:hidden opacity-50">-</span>
              </>
            )}
            <ArtistFormLocation
              isManage={!!isManage}
              artist={artist}
              onSubmit={handleSubmit}
            />
          </div>
          {artist.shortDescription && (
            <div className="mt-1 text-sm leading-tight max-md:hidden">
              {artist.shortDescription}
            </div>
          )}
        </IdentityWrapper>

        {!isManage && (
          <FollowWrapper>
            <FollowArtist artistId={artist.id} />
          </FollowWrapper>
        )}

        <PillWrapper>
          {displayedLabelArtist && (
            <ArtistButtonLink
              variant="chip"
              to={getArtistUrl(displayedLabelArtist)}
              className={css`
                &[class] {
                  background-color: color-mix(
                    in srgb,
                    var(--mi-button-color) 8%,
                    transparent
                  ) !important;
                  filter: brightness(var(--mi-chip-brightness, 1));
                }
              `}
            >
              {t("onLabel", { name: displayedLabelArtist.name })}
            </ArtistButtonLink>
          )}
          {isManage && <ArtistFormLabel artist={artist} />}
        </PillWrapper>

        <StripWrapper pulledUp={!displayedLabelArtist && !isManage}>
          <ArtistHeaderActionsStrip
            artist={artist}
            isManage={isManage}
            onSubmit={handleSubmit}
          />
        </StripWrapper>
      </HeaderGrid>
    </div>
  );
};

export default ArtistHeaderSection;
