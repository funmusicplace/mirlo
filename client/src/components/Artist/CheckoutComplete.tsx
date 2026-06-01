import { useQuery } from "@tanstack/react-query";
import DownloadAlbumButton from "components/common/DownloadAlbumButton";
import FullPageLoadingSpinner from "components/common/FullPageLoadingSpinner";
import ItemTransactionCard from "components/common/ItemTransactionCard";
import { WidthWrapper } from "components/common/WidthContainer";
import MerchDownloadableContent from "components/Merch/MerchDownloadableContent";
import RecommendedAlbums from "components/TrackGroup/RecommendedAlbums";
import { queryArtist, queryMerch, queryTrackGroup } from "queries";
import { useTranslation } from "react-i18next";
import { FaCheck } from "react-icons/fa";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  getArtistUrl,
  getMerchUrl,
  getReleaseUrl,
  getTrackUrl,
} from "utils/artist";

import Box from "../common/Box";

function CheckoutComplete() {
  const { t } = useTranslation("translation", {
    keyPrefix: "artist",
  });
  const { t: tPost } = useTranslation("translation", {
    keyPrefix: "post",
  });

  const { artistId } = useParams();

  const [searchParams] = useSearchParams();
  const trackGroupId = searchParams.get("trackGroupId");
  const trackId = searchParams.get("trackId");
  const merchId = searchParams.get("merchId");
  const purchaseType = searchParams.get("purchaseType");

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

  const isSimpleMessage = purchaseType === "tip" || purchaseType === "follow";
  const headerMessage =
    purchaseType === "follow"
      ? t("successfullyFollowedArtist")
      : purchaseType === "tip"
        ? t("youveTippedArtist", { artistName: artist.name })
        : t("purchaseComplete");

  const itemLink =
    purchaseType === "trackGroup" && trackGroup
      ? getReleaseUrl(artist, trackGroup)
      : purchaseType === "track" && track && trackGroup
        ? getTrackUrl(artist, trackGroup, track)
        : purchaseType === "merch" && merch
          ? getMerchUrl(artist, merch)
          : null;

  const itemTitle =
    purchaseType === "trackGroup" && trackGroup
      ? trackGroup.title
      : purchaseType === "track" && track
        ? track.title
        : purchaseType === "merch" && merch
          ? merch.title
          : null;

  const itemCover =
    purchaseType === "merch" && merch
      ? merch.images?.[0]?.sizes?.[300]
      : trackGroup?.cover?.sizes?.[300];

  return (
    <WidthWrapper className="mt-8 mb-12 flex flex-col gap-2">
      <ItemTransactionCard
        header={
          <>
            <span
              aria-hidden
              className="w-5 h-5 rounded-full bg-(--mi-button-color) text-(--mi-button-text-color) grid place-items-center shrink-0"
            >
              <FaCheck className="w-2.5 h-2.5" />
            </span>
            {headerMessage}
          </>
        }
        cover={isSimpleMessage ? undefined : itemCover}
        coverAlt={itemTitle ?? ""}
        title={isSimpleMessage ? undefined : (itemTitle ?? undefined)}
        titleLink={itemLink ?? undefined}
        artistName={artist.name}
        artistUrl={getArtistUrl(artist)}
      >
        {(purchaseType === "trackGroup" || purchaseType === "track") &&
          trackGroup && (
            <div className="mt-4">
              <DownloadAlbumButton
                trackGroup={trackGroup}
                track={purchaseType === "track" ? track : undefined}
              />
            </div>
          )}

        {purchaseType === "merch" && merch && (
          <div className="mt-4 w-full max-w-md">
            <MerchDownloadableContent merch={merch} artist={artist} />
          </div>
        )}

        <div className="flex flex-wrap gap-6 justify-center mt-4 text-sm">
          {!isSimpleMessage && (
            <Link to="/profile/collection">{t("viewInCollection")} →</Link>
          )}
          <Link to={getArtistUrl(artist)}>{t("backToArtist")}</Link>
        </div>
      </ItemTransactionCard>

      {purchaseType === "trackGroup" && trackGroup && (
        <RecommendedAlbums
          trackGroupId={trackGroup.id}
          artist={artist}
          centered
        />
      )}
    </WidthWrapper>
  );
}

export default CheckoutComplete;
