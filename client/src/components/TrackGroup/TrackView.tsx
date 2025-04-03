import { css } from "@emotion/css";

import { useNavigate, useParams } from "react-router-dom";
import ClickToPlayAlbum from "../common/ClickToPlayAlbum";
import Box from "../common/Box";
import { useTranslation } from "react-i18next";
import FullPageLoadingSpinner from "components/common/FullPageLoadingSpinner";
import PublicTrackGroupListing from "components/common/TrackTable/PublicTrackGroupListing";
import { MetaCard } from "components/common/MetaCard";
import ImageWithPlaceholder from "components/common/ImageWithPlaceholder";

import { bp } from "../../constants";

import ReleaseDate from "./ReleaseDate";
import WidthContainer from "components/common/WidthContainer";
import TrackGroupTitle from "./TrackGroupTitle";
import SupportArtistPopUp from "components/common/SupportArtistPopUp";
import { useAuthContext } from "state/AuthContext";
import TrackGroupMerch from "./TrackGroupMerch";
import { useQuery } from "@tanstack/react-query";
import { queryArtist, queryTrackGroup } from "queries";
import {
  Container,
  ImageAndDetailsWrapper,
  ImageWrapper,
  SmallScreenPlayWrapper,
  TrackListingWrapper,
  UnderneathImage,
} from "./TrackGroup";
import { getReleaseUrl } from "utils/artist";
import PurchaseOrDownloadAlbum from "./PurchaseOrDownloadAlbumModal";

function TrackView() {
  const { t } = useTranslation("translation", {
    keyPrefix: "trackGroupDetails",
  });
  const navigate = useNavigate();
  const { artistId, trackGroupId, trackId } = useParams();
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

  const filteredTrack = trackGroup.tracks.find((t) => t.id === Number(trackId));

  if (!filteredTrack) {
    navigate(getReleaseUrl(artist, trackGroup));
    return null;
  }

  return (
    <WidthContainer variant="big" justify="center">
      <MetaCard
        title={filteredTrack.title}
        description={`A track by ${trackGroup.artist?.name ?? "an artist"} on Mirlo`}
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
            <TrackGroupTitle
              trackGroup={trackGroup}
              title={filteredTrack.title}
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
                    src={trackGroup.cover?.sizes?.[960]}
                    alt={trackGroup.title}
                    size={960}
                  />
                </ImageWrapper>
                <UnderneathImage>
                  <ReleaseDate releaseDate={trackGroup.releaseDate} />
                  {user?.isAdmin && filteredTrack.allowIndividualSale && (
                    <PurchaseOrDownloadAlbum
                      trackGroup={trackGroup}
                      track={filteredTrack}
                    />
                  )}
                </UnderneathImage>
                {trackGroup.merch && trackGroup.merch.length > 0 && (
                  <TrackGroupMerch merch={trackGroup.merch} />
                )}
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
                  flex-grow: 1;

                  > div {
                    max-width: 100%;
                  }
                `}
              >
                <TrackListingWrapper>
                  <PublicTrackGroupListing
                    tracks={[filteredTrack]}
                    trackGroup={trackGroup}
                  />
                </TrackListingWrapper>
                {filteredTrack.lyrics && (
                  <div
                    className={css`
                      padding: 1rem;
                      white-space: pre-line;
                    `}
                  >
                    <h3
                      className={css`
                        margin-bottom: 1rem;
                      `}
                    >
                      Lyrics
                    </h3>
                    {filteredTrack.lyrics}
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
        </div>
      </Container>
    </WidthContainer>
  );
}

export default TrackView;
