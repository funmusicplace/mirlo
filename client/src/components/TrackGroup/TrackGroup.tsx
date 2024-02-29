import { css } from "@emotion/css";

import { useParams } from "react-router-dom";
import ClickToPlayAlbum from "../common/ClickToPlayAlbum";
import { useGlobalStateContext } from "state/GlobalState";
import Box from "../common/Box";
import usePublicObjectById from "utils/usePublicObjectById";
import { useTranslation } from "react-i18next";
import FullPageLoadingSpinner from "components/common/FullPageLoadingSpinner";
import PublicTrackGroupListing from "components/common/PublicTrackGroupListing";
import { MetaCard } from "components/common/MetaCard";
import { useArtistContext } from "state/ArtistContext";
import ImageWithPlaceholder from "components/common/ImageWithPlaceholder";

import PurchaseOrDownloadAlbum from "./PurchaseOrDownloadAlbumModal";
import { bp } from "../../constants";

import MarkdownContent from "components/common/MarkdownContent";
import Wishlist from "./Wishlist";
import ReleaseDate from "./ReleaseDate";
import WidthContainer from "components/common/WidthContainer";
import TrackGroupTitle from "./TrackGroupTitle";
import styled from "@emotion/styled";
import SupportArtistPopUp from "components/common/SupportArtistPopUp";
import TrackGroupPills from "./TrackGroupPills";
import TrackGroupEmbed from "./TrackGroupEmbed";

const Container = styled.div<{ user?: LoggedInUser }>`
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

const ImageWrapper = styled.div`
  border: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
`;

const UnderneathImage = styled.div`
  margin-top: 0.5rem;
  margin-bottom: 0.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const SmallScreenPlayWrapper = styled.div`
  margin-bottom: 0.5rem;
  @media screen and (min-width: ${bp.small}px) {
    display: none;
  }
`;

const ImageAndDetailsWrapper = styled.div`
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

const AboutWrapper = styled.div<{
  trackGroupCredits: string;
}>`
  margin: 1.25rem 0 1.25rem;
  ${(props) =>
    props.trackGroupCredits
      ? "padding: 0.5rem 3rem 0.25rem 0rem;"
      : "padding: 0.5rem 2rem 0.25rem 0rem;"}

  p {
    line-height: 1.5rem;
  }

  @media screen and (max-width: ${bp.medium}px) {
    max-width: 100%;
    padding: 0.5rem 0rem 0.25rem 0rem;
    margin-bottom: 0.5rem;
    border-right: 0;
  }
`;

const CreditsWrapper = styled.div<{
  trackGroupCredits: string;
  trackGroupAbout: string;
}>`
  font-size: var(--mi-font-size-small);
  opacity: 0.5;
  height: auto;
  p {
    line-height: 1.3rem;
  }
  ${(props) =>
    props.trackGroupCredits ? "border-left: 1px solid;" : "display: none;"}
  ${(props) =>
    props.trackGroupAbout
      ? "margin: 1.25rem 0; padding: 0.5rem 0rem 0.5rem 2rem;"
      : "margin: .25rem 0 1.25rem 0; border-left: none; padding: 0.5rem 0.25rem 0.5rem 0;"}
  @media screen and (max-width: ${bp.medium}px) {
    ${(props) => (props.trackGroupCredits ? "border-top: 1px solid;" : "")}
    max-width: 100%;
    padding: 1rem 0.25rem 0.5rem 0rem;
    margin-top: 0;
    border-left: 0;
  }
`;

const TrackgroupInfosWrapper = styled.div`
  display: grid;
  grid-template-columns: 63% 37%;

  @media screen and (max-width: ${bp.medium}px) {
    display: flex;
    flex-direction: column;
  }
`;

function TrackGroup() {
  const { t } = useTranslation("translation", {
    keyPrefix: "trackGroupDetails",
  });

  const {
    state: { artist, isLoading: isLoadingArtist, userStripeStatus },
  } = useArtistContext();
  const { artistId, trackGroupId } = useParams();
  const {
    state: { user },
  } = useGlobalStateContext();

  const { object: trackGroup, isLoadingObject: isLoadingTrackGroup } =
    usePublicObjectById<TrackGroup>(
      "trackGroups",
      trackGroupId,
      `?artistId=${artistId}`
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

  const trackGroupCredits = trackGroup.credits;
  const trackGroupAbout = trackGroup.about;

  return (
    <WidthContainer variant="big" justify="center">
      <MetaCard
        title={trackGroup.title}
        description={
          trackGroup.about ??
          `An album by ${trackGroup.artist?.name ?? "an artist"} on Mirlo`
        }
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
            <TrackGroupTitle trackGroup={trackGroup} />

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
                    src={trackGroup.cover?.sizes?.[960]}
                    alt={trackGroup.title}
                    size={960}
                  />
                </ImageWrapper>
                <UnderneathImage>
                  <ReleaseDate releaseDate={trackGroup.releaseDate} />
                  <div
                    className={css`
                      display: flex;
                      justify-content: flex-end;
                      align-items: center;
                      gap: 1rem;
                      button {
                        background: var(--mi-darken-background-color);
                        margin-left: 0 !important;
                      }
                      a {
                        font-size: var(--mi-font-size-normal);
                      }

                      @media screen and (max-width: ${bp.small}px) {
                        gap: 0.75rem;
                      }
                    `}
                  >
                    <TrackGroupEmbed trackGroup={trackGroup} />
                    <Wishlist trackGroup={trackGroup} />
                    <PurchaseOrDownloadAlbum trackGroup={trackGroup} />
                  </div>
                </UnderneathImage>
                <SmallScreenPlayWrapper>
                  <ClickToPlayAlbum
                    trackGroupId={trackGroup.id}
                    className={css`
                      width: 50px !important;
                      margin-right: 10px;
                    `}
                  />
                </SmallScreenPlayWrapper>
              </ImageAndDetailsWrapper>
              <div
                className={css`
                  max-width: 59%;
                  flex: 59%;
                  @media screen and (max-width: ${bp.small}px) {
                    max-width: 100%;
                    flex: 100%;
                    margin-left: 0;
                  }
                `}
              >
                <PublicTrackGroupListing
                  tracks={trackGroup.tracks}
                  trackGroup={trackGroup}
                />
              </div>
            </div>
          </div>
          <TrackgroupInfosWrapper>
            {trackGroupAbout && (
              <AboutWrapper trackGroupCredits={trackGroupCredits}>
                <MarkdownContent content={trackGroup.about} />
              </AboutWrapper>
            )}

            <CreditsWrapper
              trackGroupCredits={trackGroupCredits}
              trackGroupAbout={trackGroupAbout}
            >
              <MarkdownContent content={trackGroup.credits} />
            </CreditsWrapper>
          </TrackgroupInfosWrapper>

          <TrackGroupPills tags={trackGroup.tags} />
          <div
            className={css`
              margin-top: 2rem;
              text-align: center;
            `}
          >
            {trackGroup.artist && userStripeStatus?.chargesEnabled && (
              <SupportArtistPopUp artist={trackGroup.artist} />
            )}
          </div>
        </div>
      </Container>
    </WidthContainer>
  );
}

export default TrackGroup;
