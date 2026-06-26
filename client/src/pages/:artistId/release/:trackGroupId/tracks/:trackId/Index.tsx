import { css } from "@emotion/css";
import { useQuery } from "@tanstack/react-query";
import FullPageLoadingSpinner from "components/common/FullPageLoadingSpinner";
import ImageWithPlaceholder from "components/common/ImageWithPlaceholder";
import { MetaCard } from "components/common/MetaCard";
import SupportArtistPopUp from "components/common/SupportArtistPopUp";
import PublicTrackGroupListing from "components/common/TrackList/PublicTrackGroupListing";
import WidthContainer from "components/common/WidthContainer";
import { queryArtist, queryTrackGroup } from "queries";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { getReleaseUrl } from "utils/artist";
import { useMatchMedia } from "utils/useMatchMedia";

import { bp } from "../../../../../../constants";
import Box from "components/common/Box";
import ClickToPlayTracks from "components/common/ClickToPlayTracks";

import TrackGroupTitle from "components/TrackGroup/ItemViewTitle";
import PurchaseOrDownloadAlbum from "components/TrackGroup/PurchaseOrDownloadAlbumModal";
import ReleaseDate from "components/TrackGroup/ReleaseDate";
import {
  Container,
  ImageAndDetailsWrapper,
  ImageWrapper,
  ItemViewContentWrapper,
  SmallScreenPlayWrapper,
  TrackListingWrapper,
  UnderneathImage,
} from "pages/:artistId/release/:trackGroupId/Index";
import TrackGroupEmbed, { TrackEmbed } from "components/TrackGroup/TrackGroupEmbed";
import TrackGroupMerch from "components/TrackGroup/TrackGroupMerch";

function Index() {
  const { t } = useTranslation("translation", {
    keyPrefix: "trackGroupDetails",
  });
  const navigate = useNavigate();
  const isMobile = useMatchMedia(`screen and (max-width: ${bp.small}px)`);
  const { artistId, trackGroupId, trackId } = useParams();
  const { data: artist, isLoading: isLoadingArtist } = useQuery(
    queryArtist({ artistSlug: artistId ?? "" })
  );
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

  const filteredTrack = trackGroup.tracks.find((t) => t.id === Number(trackId));

  if (!filteredTrack) {
    navigate(getReleaseUrl(artist, trackGroup));
    return null;
  }

  return (
    <WidthContainer variant="big" justify="center">
      <MetaCard
        title={filteredTrack.title ?? "Untitled track"}
        description={`A track by ${trackGroup.artist?.name ?? "an artist"} on Mirlo`}
        image={trackGroup.cover?.sizes?.[600]}
      />
      <Container>
        <ItemViewContentWrapper>
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
              trackGroup={{ ...trackGroup, tracks: [filteredTrack] }}
              title={filteredTrack.title ?? ""}
            />

            <div
              className={css`
                display: flex;
                justify-content: center;
                align-items: flex-start;
                flex-wrap: nowrap;
                gap: 0.5rem;

                @media screen and (max-width: ${bp.small}px) {
                  flex-direction: column;
                  align-items: stretch;
                  gap: 0;
                }
              `}
            >
              <ImageAndDetailsWrapper>
                <ImageWrapper>
                  <ImageWithPlaceholder
                    src={trackGroup.cover?.sizes?.[960]}
                    alt={trackGroup.coverImageAlt}
                    size={960}
                    square
                    objectFit="contain"
                  />
                </ImageWrapper>
                <UnderneathImage>
                  <ReleaseDate releaseDate={trackGroup.releaseDate} />
                  <TrackEmbed track={filteredTrack} trackGroup={trackGroup} />
                  {filteredTrack.allowIndividualSale && (
                    <div className="grow-0 max-md:grow min-w-0 flex justify-end">
                      <PurchaseOrDownloadAlbum
                        trackGroup={trackGroup}
                        track={filteredTrack}
                      />
                    </div>
                  )}
                </UnderneathImage>
                {trackGroup.merch && trackGroup.merch.length > 0 && (
                  <TrackGroupMerch merch={trackGroup.merch} />
                )}
                <SmallScreenPlayWrapper>
                  <ClickToPlayTracks
                    trackIds={[filteredTrack.id]}
                    playLabel="track"
                  />
                </SmallScreenPlayWrapper>
              </ImageAndDetailsWrapper>
              <div
                className={css`
                  flex-grow: 1;
                  min-width: 0;

                  > div {
                    max-width: 100%;
                  }
                `}
              >
                <TrackListingWrapper>
                  <PublicTrackGroupListing
                    tracks={[filteredTrack]}
                    trackGroup={trackGroup}
                    fluidText={!isMobile}
                  />
                </TrackListingWrapper>
                {filteredTrack.lyrics && (
                  <div className="pt-4 pb-8 pr-4 pl-9 whitespace-pre-line text-sm flex flex-col gap-2">
                    <h3>{t("lyrics")}</h3>
                    <span className="italic text-xs">
                      {filteredTrack.lyrics}
                    </span>
                  </div>
                )}
                {filteredTrack.description && (
                  <div className="border-t border-(--mi-tint-x-color) pt-8 pb-4 pr-4 pl-9 whitespace-pre-line text-sm flex flex-col gap-2">
                    <h3>{t("aboutThisTrack")}</h3>
                    <span>{filteredTrack.description}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div
            className={css`
              margin-top: 2rem;
              text-align: center;
            `}
          >
            {trackGroup.artist && (
              <SupportArtistPopUp artist={trackGroup.artist} />
            )}
          </div>
        </ItemViewContentWrapper>
      </Container>
    </WidthContainer>
  );
}

export default Index;
