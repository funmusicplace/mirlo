import { useQuery } from "@tanstack/react-query";
import DownloadAlbumButton from "components/common/DownloadAlbumButton";
import FullPageLoadingSpinner from "components/common/FullPageLoadingSpinner";
import ImageWithPlaceholder from "components/common/ImageWithPlaceholder";
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
      <div className="flex flex-col items-center text-center gap-4 py-8 px-6 bg-(--mi-button-tint-color) border border-(--mi-tint-color) rounded-[var(--mi-border-radius-x)] max-w-2xl mx-auto w-full">
        <h2 className="m-0! flex items-center gap-2">
          <span
            aria-hidden
            className="w-5 h-5 rounded-full bg-(--mi-button-color) text-(--mi-button-text-color) grid place-items-center shrink-0"
          >
            <FaCheck className="w-2.5 h-2.5" />
          </span>
          {headerMessage}
        </h2>

        {!isSimpleMessage && itemCover && (
          <div className="w-60 mt-2">
            <ImageWithPlaceholder
              src={itemCover}
              alt={itemTitle ?? ""}
              size={300}
              className="w-full"
            />
          </div>
        )}

        {!isSimpleMessage && itemTitle && (
          <div className="flex flex-col gap-1">
            {itemLink ? (
              <p className="font-bold text-lg m-0!">
                <Link to={itemLink} className="no-underline! text-inherit!">
                  {itemTitle}
                </Link>
              </p>
            ) : (
              <p className="font-bold text-lg m-0!">{itemTitle}</p>
            )}
            <p className="text-sm text-(--mi-secondary-text-color) m-0!">
              {tPost("postByPrefix")}{" "}
              <Link
                to={getArtistUrl(artist)}
                className="text-(--mi-button-color)!"
              >
                {artist.name}
              </Link>
            </p>
          </div>
        )}

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
      </div>

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
