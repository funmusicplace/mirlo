import { Link, useParams, useSearchParams } from "react-router-dom";
import Box from "../common/Box";
import { Trans, useTranslation } from "react-i18next";
import Confetti from "components/common/Confetti";
import FullPageLoadingSpinner from "components/common/FullPageLoadingSpinner";
import { WidthWrapper } from "components/common/WidthContainer";

import { useQuery } from "@tanstack/react-query";
import {
  queryArtist,
  queryMerch,
  queryTrackGroup,
  queryPublicRecommendedTrackGroups,
} from "queries";
import { getMerchUrl, getReleaseUrl, getTrackUrl } from "utils/artist";
import ImageWithPlaceholder from "components/common/ImageWithPlaceholder";
import MerchDownloadableContent from "components/Merch/MerchDownloadableContent";
import RecommendedAlbums from "components/TrackGroup/RecommendedAlbums";

function CheckoutComplete() {
  const { t } = useTranslation("translation", {
    keyPrefix: "artist",
  });

  const { artistId } = useParams();

  const [searchParams] = useSearchParams();
  const trackGroupId = searchParams.get("trackGroupId");
  const trackId = searchParams.get("trackId");
  const merchId = searchParams.get("merchId");

  const { data: trackGroup } = useQuery(
    queryTrackGroup({ albumSlug: trackGroupId })
  );

  const { data: artist, isLoading: isLoadingArtist } = useQuery(
    queryArtist({ artistSlug: artistId })
  );

  const { data: merch } = useQuery(
    queryMerch({
      artistId: artistId ?? "",
      merchId: merchId ?? "",
    })
  );
  const track = trackGroup?.tracks.find((t) => t.id === Number(trackId));

  if (!artist && !isLoadingArtist) {
    return <Box>{t("doesNotExist")}</Box>;
  } else if (!artist) {
    return <FullPageLoadingSpinner />;
  }

  const purchaseType = searchParams.get("purchaseType");

  return (
    <WidthWrapper className="mt-16 flex flex-col md:items-start items-center md:text-left text-center">
      <h2 className="md:mb-4 mt-6">
        {purchaseType === "follow"
          ? t("successfullyFollowedArtist")
          : t("purchaseComplete")}
      </h2>
      <div className="flex w-full">
        <div className="flex gap-4 w-full flex-col md:flex-row w-full items-center mt-6">
          {trackGroup && (
            <ImageWithPlaceholder
              src={trackGroup.cover?.sizes?.[300]}
              alt={trackGroup.title ?? ""}
              size={300}
              className="md:w-80 mt-4 w-full"
            />
          )}
          <div className="flex flex-col flex-grow items-center md:items-start">
            <span>
              {purchaseType === "trackGroup" && trackGroup && (
                <Trans
                  t={t}
                  i18nKey="youveBoughtRelease"
                  components={{
                    linkToRelease: (
                      <Link to={getReleaseUrl(artist, trackGroup)}></Link>
                    ),
                    linkToCollection: <Link to="/profile/collection"></Link>,
                  }}
                  values={{ title: trackGroup.title }}
                />
              )}
              {purchaseType === "track" && track && trackGroup && (
                <Trans
                  t={t}
                  i18nKey="youveBoughtTrack"
                  components={{
                    linkToTrack: (
                      <Link to={getTrackUrl(artist, trackGroup, track)}></Link>
                    ),
                    linkToCollection: <Link to="/profile/collection"></Link>,
                  }}
                  values={{ trackName: track.title }}
                />
              )}
              {purchaseType === "merch" && merch && (
                <>
                  <Trans
                    t={t}
                    i18nKey="youveBoughtMerch"
                    components={{
                      linkToMerch: (
                        <Link to={getMerchUrl(artist, merch)}></Link>
                      ),
                    }}
                    values={{ title: merch.title }}
                  />
                  <MerchDownloadableContent merch={merch} artist={artist} />
                </>
              )}
              {purchaseType === "tip" && t("youveTippedArtist")}
            </span>
            <div className="w-40">
              <Confetti />
            </div>
          </div>
        </div>
      </div>
      {purchaseType === "trackGroup" && trackGroup && (
        <RecommendedAlbums trackGroupId={trackGroup.id} artist={artist} />
      )}
    </WidthWrapper>
  );
}

export default CheckoutComplete;
