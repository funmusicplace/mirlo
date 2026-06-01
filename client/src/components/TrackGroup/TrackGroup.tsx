import { css } from "@emotion/css";
import styled from "@emotion/styled";
import { useQuery } from "@tanstack/react-query";
import FullPageLoadingSpinner from "components/common/FullPageLoadingSpinner";
import ImageWithPlaceholder from "components/common/ImageWithPlaceholder";
import MarkdownContent from "components/common/MarkdownContent";
import { MetaCard } from "components/common/MetaCard";
import SupportArtistPopUp from "components/common/SupportArtistPopUp";
import PublicTrackGroupListing from "components/common/TrackList/PublicTrackGroupListing";
import WidthContainer from "components/common/WidthContainer";
import { queryArtist, queryTrackGroup } from "queries";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { isTrackGroupPublished } from "utils/artist";
import { useMatchMedia } from "utils/useMatchMedia";

import { between, bp } from "../../constants";
import Box, { ArtistBox } from "../common/Box";
import ClickToPlayTracks from "../common/ClickToPlayTracks";

import FlagContent from "./FlagContent";
import Fundraiser from "./Fundraiser";
import TrackGroupTitle from "./ItemViewTitle";
import PurchaseOrDownloadAlbum from "./PurchaseOrDownloadAlbumModal";
import RecommendedAlbums from "./RecommendedAlbums";
import ReleaseDate from "./ReleaseDate";
import ReleaseDownloadableContent from "./ReleaseDownloadableContent";
import TrackGroupEmbed from "./TrackGroupEmbed";
import TrackGroupMerch from "./TrackGroupMerch";
import TrackGroupPills from "./TrackGroupPills";
import Wishlist from "./Wishlist";

export const coverSizeMin = "280px";
export const coverSizeMax = "470px";

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

export const AboutWrapper = styled.div<{
  trackGroupCredits: boolean;
}>`
  margin: 1.25rem 0;
  padding: 0.25rem;
  ${(props) =>
    props.trackGroupCredits
      ? "padding: 0.5rem 3rem 0.25rem 0rem;"
      : "padding: 0.5rem 2rem 0.25rem 0rem;"}

  p {
    line-height: 1.5rem;
  }

  @media screen and (max-width: ${bp.medium}px) {
    max-width: 100%;
    padding: 0.5rem 0.25rem 0.5rem 0rem;
    margin: var(--mi-side-paddings-xsmall);
    margin-bottom: 0.5rem;
    border-right: 0;
  }
`;

export const CreditsWrapper = styled.div<{
  trackGroupCredits: boolean;
  trackGroupAbout: boolean;
  showAboutInsteadOfTrackListing?: boolean;
}>`
  font-size: var(--mi-font-size-small);
  opacity: 0.5;
  height: auto;
  p {
    line-height: 1.3rem;
  }
  ${(props) =>
    props.trackGroupCredits ? "border-left: 1px solid; " : "display: none;"}

  ${(props) =>
    props.trackGroupAbout
      ? "margin: 1.25rem 1.25rem; padding: 0.5rem 0rem 0.5rem 2rem;"
      : "margin: .25rem 0 1.25rem 0; border-left: none; padding: 0.5rem 0.25rem 0.5rem 0;"}

  ${(props) =>
    props.showAboutInsteadOfTrackListing
      ? "border-left: 0px solid !important; padding-left: 0 !important; margin-left: 0 !important;"
      : ""}

  @media screen and (max-width: ${bp.medium}px) {
    ${(props) => (props.trackGroupCredits ? "border-top: 1px solid;" : "")}
    max-width: 100%;
    padding: 0.5rem 0.25rem 0.5rem 0rem;
    margin: var(--mi-side-paddings-xsmall);
    margin-top: 0;
    border-left: 0;
  }
`;

export const TrackgroupInfosWrapper = styled.div`
  display: grid;
  grid-template-columns: 63% 37%;

  @media screen and (max-width: ${bp.medium}px) {
    display: flex;
    flex-direction: column;
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

function TrackGroup() {
  const { t } = useTranslation("translation", {
    keyPrefix: "trackGroupDetails",
  });
  const isCompactLayout = useMatchMedia(between(bp.medium, bp.xlarge));
  const isMobile = useMatchMedia(`screen and (max-width: ${bp.small}px)`);

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

  const trackGroupCredits = trackGroup.credits;
  const trackGroupAbout = trackGroup.about;

  const showAboutInsteadOfTrackListing = trackGroup.tracks.length === 0;

  return (
    <WidthContainer variant="big" justify="center">
      <MetaCard
        title={trackGroup.title ?? "Untitled release"}
        description={`An album by ${trackGroup.artist?.name ?? "an artist"} on Mirlo`}
        image={trackGroup.cover?.sizes?.[600]}
      />
      <Container>
        <ItemViewContentWrapper>
          {!isPublished && (
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
          <div
            className={css`
              display: flex;
              flex-direction: column;
              justify-content: center;

              @media screen and (max-width: ${bp.small}px) {
                padding-top: 0px;
              }
            `}
          >
            <TrackGroupTitle
              trackGroup={trackGroup}
              title={trackGroup.title ?? ""}
            />

            <div className="flex flex-nowrap flex-col items-stretch gap-0 sm:flex-row sm:justify-center sm:items-start sm:gap-6">
              <ImageAndDetailsWrapper>
                <ImageWrapper>
                  <ImageWithPlaceholder
                    src={trackGroup.cover?.sizes?.[600]}
                    alt={t(`coverForTitle`, {
                      title: trackGroup.title,
                    })}
                    size={600}
                    square
                    objectFit="contain"
                  />
                </ImageWrapper>
                <UnderneathImage>
                  <ReleaseDate releaseDate={trackGroup.releaseDate} />
                  <TrackGroupEmbed trackGroup={trackGroup} />
                  <Wishlist trackGroup={trackGroup} inArtistPage />
                  <div className="grow-0 max-md:grow min-w-0 flex justify-end">
                    <PurchaseOrDownloadAlbum trackGroup={trackGroup} />
                  </div>
                </UnderneathImage>
                {trackGroup.merch && trackGroup.merch.length > 0 && (
                  <div
                    className={css`
                      @media screen and (max-width: ${bp.small}px) {
                        order: 1;
                      }
                    `}
                  >
                    <TrackGroupMerch merch={trackGroup.merch} />
                  </div>
                )}
                <SmallScreenPlayWrapper>
                  <ClickToPlayTracks
                    trackIds={trackGroup.tracks
                      .filter((t) => t.isPlayable)
                      .map((t) => t.id)}
                    playLabel="album"
                  />
                </SmallScreenPlayWrapper>
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
                  {trackGroup.isGettable && (
                    <p
                      className={css`
                        padding: var(--mi-side-paddings-xsmall);
                        padding-bottom: 1rem !important;

                        @media screen and (min-width: ${bp.medium}px) {
                          margin-top: 1rem;
                        }
                      `}
                    >
                      <small>{t("downloadCodecsInfo")}</small>
                    </p>
                  )}
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
            {trackGroup.downloadableContent &&
              trackGroup.downloadableContent.length > 0 && (
                <ReleaseDownloadableContent
                  trackGroup={trackGroup}
                  artist={artist}
                />
              )}
          </div>
          <TrackgroupInfosWrapper>
            {!showAboutInsteadOfTrackListing && trackGroupAbout && (
              <AboutWrapper trackGroupCredits={Boolean(trackGroupCredits)}>
                <MarkdownContent content={trackGroup.about} />
              </AboutWrapper>
            )}

            <CreditsWrapper
              showAboutInsteadOfTrackListing={showAboutInsteadOfTrackListing}
              trackGroupCredits={Boolean(trackGroupCredits)}
              trackGroupAbout={Boolean(trackGroupAbout)}
            >
              <MarkdownContent content={trackGroup.credits} />
            </CreditsWrapper>
          </TrackgroupInfosWrapper>

          <div
            className={css`
              display: flex;
              justify-content: space-between;
              margin-bottom: 2rem;

              @media screen and (max-width: ${bp.medium}px) {
                max-width: 100%;
                margin: var(--mi-side-paddings-xsmall);
                margin-bottom: 1.5rem;
              }
            `}
          >
            <TrackGroupPills tags={trackGroup.tags} />
          </div>
          <RecommendedAlbums trackGroupId={trackGroup.id} artist={artist} />
          {trackGroup.artist && (
            <SupportArtistPopUp artist={trackGroup.artist} />
          )}
          <FlagContent trackGroupId={trackGroup.id} />
        </ItemViewContentWrapper>
      </Container>
    </WidthContainer>
  );
}

export default TrackGroup;
