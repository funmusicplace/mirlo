import styled from "@emotion/styled";
import { useQuery } from "@tanstack/react-query";
import Box from "components/common/Box";
import ClickToPlayTracks from "components/common/ClickToPlayTracks";
import FullPageLoadingSpinner from "components/common/FullPageLoadingSpinner";
import ImageWithPlaceholder from "components/common/ImageWithPlaceholder";
import { MetaCard } from "components/common/MetaCard";
import StickyColumn from "components/common/StickyColumn";
import WidthContainer from "components/common/WidthContainer";
import FlagContent from "components/TrackGroup/FlagContent";
import TrackGroupTitle from "components/TrackGroup/ItemViewTitle";
import PurchaseOrDownloadAlbum from "components/TrackGroup/PurchaseOrDownloadAlbumModal";
import ReleaseArtistBlock from "components/TrackGroup/ReleaseArtistBlock";
import {
  prominentSectionLabelClass,
  sectionLabelClass,
} from "components/TrackGroup/ReleaseInfos";
import TrackCredits from "components/TrackGroup/TrackCredits";
import { TrackEmbed } from "components/TrackGroup/TrackGroupEmbed";
import TrackGroupMerch from "components/TrackGroup/TrackGroupMerch";
import {
  Container,
  ImageAndDetailsWrapper,
  ImageWrapper,
  ItemViewContentWrapper,
  MerchWrapper,
  SmallScreenPlayWrapper,
  TitleAndContentColumn,
  TrackListingWrapper,
  UnderneathImage,
} from "pages/{artistId}/release/{trackGroupId}/Index";
import { queryArtist, queryTrackGroup } from "queries";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { getReleaseUrl } from "utils/artist";

import { bp } from "../../../../../../constants";

const TrackSections = styled.div`
  > * + * {
    margin-top: 2rem;
    padding-top: 1.5rem;
    border-top: 1px solid var(--mi-tint-x-color);
  }

  @media screen and (max-width: ${bp.small}px) {
    padding: var(--mi-side-paddings-xsmall);
  }
`;

function Index() {
  const { t } = useTranslation("translation", {
    keyPrefix: "trackGroupDetails",
  });
  const navigate = useNavigate();
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
        description={t("trackByArtist", {
          artist: trackGroup.artist?.name ?? "an artist",
        })}
        image={trackGroup.cover?.sizes?.[600]}
      />
      <Container>
        <ItemViewContentWrapper>
          <TitleAndContentColumn>
            <TrackGroupTitle
              trackGroup={{ ...trackGroup, tracks: [filteredTrack] }}
              title={filteredTrack.title ?? ""}
            />

            <div className="flex flex-nowrap flex-col items-stretch gap-0 sm:flex-row sm:justify-center sm:gap-6">
              <ImageAndDetailsWrapper>
                <StickyColumn>
                  <ImageWrapper>
                    <ImageWithPlaceholder
                      src={trackGroup.cover?.sizes?.[960]}
                      alt={trackGroup.coverImageAlt}
                      size={960}
                      square
                      objectFit="contain"
                    />
                  </ImageWrapper>
                  <UnderneathImage className="justify-end!">
                    <TrackEmbed track={filteredTrack} trackGroup={trackGroup} />
                    <div className="min-w-0 flex justify-end items-center self-stretch">
                      {filteredTrack.allowIndividualSale ? (
                        <PurchaseOrDownloadAlbum
                          trackGroup={trackGroup}
                          track={filteredTrack}
                        />
                      ) : (
                        <PurchaseOrDownloadAlbum trackGroup={trackGroup} />
                      )}
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
                  <SmallScreenPlayWrapper>
                    <ClickToPlayTracks
                      trackIds={[filteredTrack.id]}
                      playLabel="track"
                    />
                  </SmallScreenPlayWrapper>
                </StickyColumn>
              </ImageAndDetailsWrapper>
              <TrackListingWrapper>
                <TrackSections>
                  {filteredTrack.lyrics && (
                    <section>
                      <h2 className={prominentSectionLabelClass}>
                        {t("lyrics")}
                      </h2>
                      <p className="m-0 text-sm italic leading-relaxed whitespace-pre-line">
                        {filteredTrack.lyrics}
                      </p>
                    </section>
                  )}
                  {filteredTrack.description && (
                    <section>
                      <h2 className={prominentSectionLabelClass}>
                        {t("aboutThisTrack")}
                      </h2>
                      <p className="m-0 max-w-prose whitespace-pre-line">
                        {filteredTrack.description}
                      </p>
                    </section>
                  )}
                  <section>
                    <h2 className={sectionLabelClass}>{t("credits")}</h2>
                    <TrackCredits
                      track={filteredTrack}
                      trackGroup={trackGroup}
                    />
                  </section>
                </TrackSections>
              </TrackListingWrapper>
            </div>
          </TitleAndContentColumn>
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
