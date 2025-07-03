import { css } from "@emotion/css";
import { Link, useParams, useSearchParams } from "react-router-dom";
import Box from "../common/Box";
import { Trans, useTranslation } from "react-i18next";
import Confetti from "components/common/Confetti";
import FullPageLoadingSpinner from "components/common/FullPageLoadingSpinner";
import { WidthWrapper } from "components/common/WidthContainer";

import { useQuery } from "@tanstack/react-query";
import { queryArtist, queryMerch, queryTrackGroup } from "queries";
import { getMerchUrl, getReleaseUrl, getTrackUrl } from "utils/artist";
import ImageWithPlaceholder from "components/common/ImageWithPlaceholder";

function CheckoutComplete() {
  const { t } = useTranslation("translation", {
    keyPrefix: "artist",
  });

  const { artistId } = useParams();

  const [searchParams] = useSearchParams();
  const trackGroupId = searchParams.get("trackGroupId");
  const trackId = searchParams.get("trackId");
  const { data: trackGroup } = useQuery(
    queryTrackGroup({ albumSlug: trackGroupId })
  );

  const { data: artist, isLoading: isLoadingArtist } = useQuery(
    queryArtist({ artistSlug: artistId })
  );
  const { data: merch } = useQuery(
    queryMerch({
      artistId: artistId ?? "",
      merchId: searchParams.get("merchId") ?? "",
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
    <WidthWrapper
      variant="medium"
      className={css`
        margin-top: 4rem !important;
        align-items: center;
        text-align: center;

        h1 {
          margin-bottom: 1rem;
        }

        svg {
          max-width: 200px;
          margin: 0 auto;
          display: block;
        }
      `}
    >
      <h1>{t("purchaseComplete")}</h1>
      <div
        className={css`
          display: flex;

          div:first-child {
            flex-grow: 1;
          }
        `}
      >
        <div
          className={css`
            display: flex;

            div:second-child {
              flex-grow: 1;
            }

            img {
              width: 100%;
            }
          `}
        >
          {trackGroup && (
            <ImageWithPlaceholder
              src={trackGroup.cover?.sizes?.[300]}
              alt={trackGroup.title ?? ""}
              size={300}
            />
          )}
          <div
            className={css`
              margin-left: 1rem;
              display: flex;
              flex-direction: column;

              justify-content: flex-start;
            `}
          >
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
                <Trans
                  t={t}
                  i18nKey="youveBoughtMerch"
                  components={{
                    linkToMerch: <Link to={getMerchUrl(artist, merch)}></Link>,
                  }}
                  values={{ title: merch.title }}
                />
              )}
              {purchaseType === "tip" && t("youveTippedArtist")}
            </span>
            <Confetti />
          </div>
        </div>
      </div>
    </WidthWrapper>
  );
}

export default CheckoutComplete;
