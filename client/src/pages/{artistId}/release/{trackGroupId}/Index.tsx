import { css } from "@emotion/css";
import styled from "@emotion/styled";
import { useQuery } from "@tanstack/react-query";
import Box, { ArtistBox } from "components/common/Box";
import ClickToPlayTracks from "components/common/ClickToPlayTracks";
import FullPageLoadingSpinner from "components/common/FullPageLoadingSpinner";
import ImageWithPlaceholder from "components/common/ImageWithPlaceholder";
import MarkdownContent from "components/common/MarkdownContent";
import { MetaCard } from "components/common/MetaCard";
import StickyColumn from "components/common/StickyColumn";
import PublicTrackGroupListing from "components/common/TrackList/PublicTrackGroupListing";
import WidthContainer from "components/common/WidthContainer";
import FlagContent from "components/TrackGroup/FlagContent";
import Fundraiser from "components/TrackGroup/Fundraiser";
import TrackGroupTitle from "components/TrackGroup/ItemViewTitle";
import PurchaseOrDownloadAlbum from "components/TrackGroup/PurchaseOrDownloadAlbumModal";
import RecommendedAlbums from "components/TrackGroup/RecommendedAlbums";
import ReleaseArtistBlock from "components/TrackGroup/ReleaseArtistBlock";
import ReleaseDownloadableContent from "components/TrackGroup/ReleaseDownloadableContent";
import ReleaseInfos from "components/TrackGroup/ReleaseInfos";
import SubscriberExclusivePill from "components/TrackGroup/SubscriberExclusivePill";
import TrackGroupEmbed from "components/TrackGroup/TrackGroupEmbed";
import TrackGroupMerch from "components/TrackGroup/TrackGroupMerch";
import Wishlist from "components/TrackGroup/Wishlist";
import { queryArtist, queryTrackGroup } from "queries";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { useAuthContext } from "state/AuthContext";
import { canUserEditArtist, isTrackGroupPublished } from "utils/artist";
import { useMatchMedia } from "utils/useMatchMedia";

import { between, bp, coverSizeMax, coverSizeMin } from "../../../../constants";

export const Container = styled.div`
  --cover-size: clamp(
    ${coverSizeMin},
    min(45vw, calc(100dvh - 275px)),
    ${coverSizeMax}
  );
  --content-width: calc(var(--cover-size) * 2.3 + 1.5rem);

  display: flex;
  align-items: flex-start;
  width: 100%;
  padding: var(--mi-side-paddings-xsmall);
`;

export const ImageWrapper = styled.div`
  border: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;

  .image-container {
    width: 100%;
  }
`;

export const UnderneathImage = styled.div`
  margin-top: 0.5rem;
  margin-bottom: 0.5rem;
  gap: 0.5rem;
  display: flex;
  justify-content: space-between;
  align-items: start;

  @media screen and (max-width: ${bp.medium}px) {
    margin-top: 0.25rem;
  }

  @media ${between(bp.medium, bp.xlarge)} {
    --mi-touch-target-min: 24px;

    button {
      height: 2rem;
      padding: 0.3rem 0.6rem;
      font-size: 0.85rem;
    }
    button svg {
      width: 0.9rem;
      height: 0.9rem;
    }
  }
`;

export const SmallScreenPlayWrapper = styled.div`
  margin-bottom: 1rem;
  margin-top: 1rem;
  padding: 0 1.5rem;
  display: flex;
  justify-content: center;
  @media screen and (min-width: ${bp.small}px) {
    display: none;
  }
`;

export const ItemViewContentWrapper = styled.div`
  width: 100%;
  max-width: var(--content-width);
  margin: 0 auto;

  td {
    padding: 0rem 0.4rem 0rem 0rem;
    margin: 0.1rem 0rem;
  }

  a {
    color: var(--mi-button-color);
  }

  @media screen and (max-width: ${bp.small}px) {
    max-width: 100%;

    td {
      padding: 0.2rem 0.1rem 0.2rem 0rem;
    }
  }
`;

export const ImageAndDetailsWrapper = styled.div`
  display: flex;
  flex-direction: column;
  width: var(--cover-size);
  flex-shrink: 0;

  @media screen and (max-width: ${bp.small}px) {
    display: contents;
  }
`;

export const TitleAndContentColumn = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;

  @media screen and (max-width: ${bp.small}px) {
    padding-top: 0px;
  }
`;

export const MerchWrapper = styled.div`
  @media screen and (max-width: ${bp.small}px) {
    order: 1;
    padding: var(--mi-side-paddings-xsmall);
  }
`;

const PurchaseNotes = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 1rem;
  color: var(--mi-light-foreground-color);

  p {
    margin: 0;
  }

  @media screen and (max-width: ${bp.small}px) {
    order: 1;
    padding: var(--mi-side-paddings-xsmall);
  }

  &:empty {
    display: none;
  }
`;

export const TrackListingWrapper = styled.div`
  width: calc(var(--cover-size) * 1.3);
  min-width: 0;

  @media screen and (min-width: ${Number(bp.small) + 1}px) {
    font-size: clamp(0.8125rem, calc(var(--cover-size) / 30), 1rem);
  }

  @media screen and (max-width: ${bp.small}px) {
    width: 100%;
  }
`;

function Index() {
  const { t } = useTranslation("translation", {
    keyPrefix: "trackGroupDetails",
  });
  const isCompactLayout = useMatchMedia(between(bp.small, bp.xlarge));
  const isMobile = useMatchMedia(`screen and (max-width: ${bp.small}px)`);

  const { user } = useAuthContext();

  const { artistId, trackGroupId } = useParams();
  const { data: artist, isPending: isLoadingArtist } = useQuery(
    queryArtist({ artistSlug: artistId ?? "" })
  );

  const { data: trackGroup, isPending: isLoadingTrackGroup } = useQuery(
    queryTrackGroup({ albumSlug: trackGroupId ?? "", artistId: artistId ?? "" })
  );

  if (!artist && !isLoadingArtist) {
    return <Box>{t("doesNotExist")}</Box>;
  } else if (!artist) {
    return <FullPageLoadingSpinner />;
  }

  if (!trackGroup && !isLoadingTrackGroup) {
    return <Box>{t("doesNotExist")}</Box>;
  } else if (!trackGroup) {
    return <FullPageLoadingSpinner />;
  }

  const isPublished = isTrackGroupPublished(trackGroup);
  const userCanSeeUnpublished = canUserEditArtist(user, artist);

  const trackGroupAbout = trackGroup.about;

  const showAboutInsteadOfTrackListing = trackGroup.tracks.length === 0;
  const playableTrackIds = trackGroup.tracks
    .filter((t) => t.isPlayable)
    .map((t) => t.id);

  return (
    <WidthContainer variant="big" justify="center">
      <MetaCard
        title={trackGroup.title ?? "Untitled release"}
        description={t("albumByArtist", {
          artist: trackGroup.artist?.name ?? "an artist",
        })}
        image={trackGroup.cover?.sizes?.[600]}
      />
      <Container>
        <ItemViewContentWrapper>
          {!isPublished && userCanSeeUnpublished && (
            <div
              className={css`
                margin-top: 0.5rem;
              `}
            >
              <ArtistBox variant="warning">
                {t("notPublishedWarning")}
              </ArtistBox>
            </div>
          )}
          <Fundraiser />
          <TitleAndContentColumn>
            <TrackGroupTitle
              trackGroup={trackGroup}
              title={trackGroup.title ?? ""}
            />

            <div className="flex flex-nowrap flex-col items-stretch gap-0 sm:flex-row sm:justify-center sm:gap-6">
              <ImageAndDetailsWrapper>
                <StickyColumn>
                  <ImageWrapper>
                    <ImageWithPlaceholder
                      src={trackGroup.cover?.sizes?.[600]}
                      alt={trackGroup.coverImageAlt}
                      size={600}
                      square
                      objectFit="contain"
                    />
                  </ImageWrapper>
                  <UnderneathImage className="justify-end!">
                    <TrackGroupEmbed trackGroup={trackGroup} />
                    <Wishlist trackGroup={trackGroup} inArtistPage />
                    <div className="min-w-0 flex justify-end items-center self-stretch">
                      {trackGroup.isSubscriberExclusive && (
                        <SubscriberExclusivePill
                          artist={artist}
                          trackGroup={trackGroup}
                        />
                      )}
                      <PurchaseOrDownloadAlbum trackGroup={trackGroup} />
                    </div>
                  </UnderneathImage>
                  {trackGroup.merch && trackGroup.merch.length > 0 && (
                    <MerchWrapper>
                      <TrackGroupMerch
                        merch={trackGroup.merch}
                        releaseArtist={artist}
                      />
                    </MerchWrapper>
                  )}
                  <PurchaseNotes className="text-xs">
                    {trackGroup.isGettable && trackGroup.tracks.length > 0 && (
                      <p>{t("downloadCodecsInfo")}</p>
                    )}
                    <ReleaseDownloadableContent
                      trackGroup={trackGroup}
                      artist={artist}
                    />
                  </PurchaseNotes>
                  {playableTrackIds.length > 0 && (
                    <SmallScreenPlayWrapper>
                      <ClickToPlayTracks
                        trackIds={playableTrackIds}
                        playLabel="album"
                      />
                    </SmallScreenPlayWrapper>
                  )}
                </StickyColumn>
              </ImageAndDetailsWrapper>
              {trackGroup.tracks.length > 0 && (
                <TrackListingWrapper>
                  <PublicTrackGroupListing
                    tracks={trackGroup.tracks}
                    trackGroup={trackGroup}
                    fluidText={!isMobile}
                    size={isCompactLayout ? "compact" : undefined}
                    keepDropdownInCompact
                  />
                </TrackListingWrapper>
              )}
              {showAboutInsteadOfTrackListing && (
                <div
                  className={css`
                    max-width: 50%;

                    @media screen and (max-width: ${bp.medium}px) {
                      max-width: 100%;
                      margin: var(--mi-side-paddings-xsmall);
                      margin-bottom: 1.5rem;
                    }
                  `}
                >
                  <MarkdownContent content={trackGroupAbout} />
                  {!trackGroupAbout && (
                    <div
                      className={css`
                        margin: 1.25rem 0;
                        padding: 0.25rem;
                        font-style: italic;
                        opacity: 0.7;
                      `}
                    >
                      <p>{t("noOtherInfoAboutThisAlbum")}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </TitleAndContentColumn>
          <ReleaseInfos
            trackGroup={trackGroup}
            showAbout={!showAboutInsteadOfTrackListing}
          />
          <RecommendedAlbums trackGroupId={trackGroup.id} artist={artist} />
          <ReleaseArtistBlock artist={artist} trackGroupId={trackGroup.id} />
          <footer className="flex justify-end mt-6">
            <FlagContent trackGroupId={trackGroup.id} />
          </footer>
        </ItemViewContentWrapper>
      </Container>
    </WidthContainer>
  );
}

export default Index;
