import { css } from "@emotion/css";

import { useParams } from "react-router-dom";
import ClickToPlayTracks from "../common/ClickToPlayTracks";
import Box, { ArtistBox } from "../common/Box";
import { useTranslation } from "react-i18next";
import FullPageLoadingSpinner from "components/common/FullPageLoadingSpinner";
import PublicTrackGroupListing from "components/common/TrackTable/PublicTrackGroupListing";
import { MetaCard } from "components/common/MetaCard";
import ImageWithPlaceholder from "components/common/ImageWithPlaceholder";

import PurchaseOrDownloadAlbum from "./PurchaseOrDownloadAlbumModal";
import { bp } from "../../constants";

import MarkdownContent from "components/common/MarkdownContent";
import Wishlist from "./Wishlist";
import ReleaseDate from "./ReleaseDate";
import WidthContainer from "components/common/WidthContainer";
import TrackGroupTitle from "./ItemViewTitle";
import styled from "@emotion/styled";
import SupportArtistPopUp from "components/common/SupportArtistPopUp";
import TrackGroupPills from "./TrackGroupPills";
import TrackGroupEmbed from "./TrackGroupEmbed";
import { useAuthContext } from "state/AuthContext";
import TrackGroupMerch from "./TrackGroupMerch";
import { useQuery } from "@tanstack/react-query";
import { queryArtist, queryTrackGroup, queryUserStripeStatus } from "queries";
import Fundraiser from "./Fundraiser";
import FlagContent from "./FlagContent";
import ReleaseDownloadableContent from "./ReleaseDownloadableContent";

export const Container = styled.div<{ user?: LoggedInUser | null }>`
  ${(props) =>
    props.user!
      ? `
    min-height: calc(100vh - 70px);
    margin-top: 0vh;`
      : `
    min-height: calc(100vh - 130px);
    margin-top: 1rem;`}
  display: flex;
  align-items: center;
  width: 100%;
  padding: var(--mi-side-paddings-xsmall);

  @media screen and (max-width: ${bp.small}px) {
    margin-top: 0rem;
  }
`;

export const ImageWrapper = styled.div`
  border: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
`;

export const UnderneathImage = styled.div`
  margin-top: 0.5rem;
  margin-bottom: 0.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

export const SmallScreenPlayWrapper = styled.div`
  margin-bottom: 0.5rem;
  @media screen and (min-width: ${bp.small}px) {
    display: none;
  }
`;

export const ImageAndDetailsWrapper = styled.div`
  display: flex;
  flex: 45%;
  max-width: 45%;
  flex-direction: column;

  @media screen and (max-width: ${bp.small}px) {
    flex: 100%;
    max-width: 100%;
    width: 100%;
    min-width: 100%;
    flex-direction: column;
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
    margin: 1.25rem 1.25rem;
    margin-bottom: 0.5rem;
    border-right: 0;
  }
`;

export const CreditsWrapper = styled.div<{
  trackGroupCredits: boolean;
  trackGroupAbout: boolean;
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
  @media screen and (max-width: ${bp.medium}px) {
    ${(props) => (props.trackGroupCredits ? "border-top: 1px solid;" : "")}
    max-width: 100%;
    padding: 0.5rem 0.25rem 0.5rem 0rem;
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
  max-width: 59%;
  flex: 59%;
  margin: 0 0 0 0.5rem;

  @media screen and (max-width: ${bp.small}px) {
    max-width: 100%;
    flex: 100%;
    margin-left: 0;
  }
`;

function TrackGroup() {
  const { t } = useTranslation("translation", {
    keyPrefix: "trackGroupDetails",
  });

  const { artistId, trackGroupId } = useParams();
  const { data: artist, isLoading: isLoadingArtist } = useQuery(
    queryArtist({ artistSlug: artistId ?? "" })
  );

  const { user } = useAuthContext();

  const { data: trackGroup, isLoading: isLoadingTrackGroup } = useQuery(
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

  const isPublished =
    trackGroup.published ||
    (trackGroup.publishedAt && new Date(trackGroup.publishedAt) <= new Date());

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
      <Container user={user}>
        <div
          className={css`
            width: 100%;
            align-items: center;

            td {
              padding: 0rem 0.4rem 0rem 0rem !important;
              margin: 0.1rem 0rem !important;
            }

            a {
              color: ${artist.properties?.colors.primary};
            }

            @media screen and (max-width: ${bp.small}px) {
              td {
                padding: 0.2rem 0.1rem 0.2rem 0rem !important;
              }
            }
          `}
        >
          {!isPublished && (
            <ArtistBox variant="warning">{t("notPublishedWarning")}</ArtistBox>
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

            <div
              className={css`
                display: flex;
                justify-content: space-between;
                flex-wrap: nowrap;

                @media screen and (max-width: ${bp.small}px) {
                  flex-direction: column;
                }
              `}
            >
              <ImageAndDetailsWrapper>
                <ImageWrapper>
                  <ImageWithPlaceholder
                    src={trackGroup.cover?.sizes?.[600]}
                    alt={t(`coverForTitle`, {
                      title: trackGroup.title,
                    })}
                    size={600}
                  />
                </ImageWrapper>
                <UnderneathImage>
                  <ReleaseDate releaseDate={trackGroup.releaseDate} />
                  <div
                    className={css`
                      display: flex;
                      justify-content: flex-end;
                      align-items: center;
                      gap: 0.5rem;

                      a {
                        font-size: var(--mi-font-size-normal);
                      }

                      @media screen and (max-width: ${bp.small}px) {
                        gap: 0.75rem;
                      }
                    `}
                  >
                    <TrackGroupEmbed trackGroup={trackGroup} />
                    <Wishlist trackGroup={trackGroup} inArtistPage />
                    <PurchaseOrDownloadAlbum trackGroup={trackGroup} />
                  </div>
                </UnderneathImage>
                {trackGroup.merch && trackGroup.merch.length > 0 && (
                  <TrackGroupMerch merch={trackGroup.merch} />
                )}
                {trackGroup.downloadableContent &&
                  trackGroup.downloadableContent.length > 0 && (
                    <ReleaseDownloadableContent
                      trackGroup={trackGroup}
                      artist={artist}
                    />
                  )}

                <SmallScreenPlayWrapper>
                  <ClickToPlayTracks
                    trackIds={trackGroup.tracks.map((t) => t.id)}
                    className={css`
                      width: 50px !important;
                      margin-right: 10px;
                    `}
                  />
                </SmallScreenPlayWrapper>
              </ImageAndDetailsWrapper>
              {trackGroup.tracks.length > 0 && (
                <TrackListingWrapper>
                  <PublicTrackGroupListing
                    tracks={trackGroup.tracks}
                    trackGroup={trackGroup}
                  />
                  {trackGroup.isGettable && (
                    <p
                      className={css`
                        margin-left: 2.5rem;
                        margin-top: 1rem;
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
          </div>
          <TrackgroupInfosWrapper>
            {!showAboutInsteadOfTrackListing && trackGroupAbout && (
              <AboutWrapper trackGroupCredits={Boolean(trackGroupCredits)}>
                <MarkdownContent content={trackGroup.about} />
              </AboutWrapper>
            )}

            <CreditsWrapper
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
            `}
          >
            <TrackGroupPills tags={trackGroup.tags} />
            <FlagContent trackGroupId={trackGroup.id} />
          </div>
          {trackGroup.artist && (
            <SupportArtistPopUp artist={trackGroup.artist} />
          )}
        </div>
      </Container>
    </WidthContainer>
  );
}

export default TrackGroup;
