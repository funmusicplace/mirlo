import { css } from "@emotion/css";

import { Link, useParams } from "react-router-dom";
import Box from "../common/Box";
import { Trans, useTranslation } from "react-i18next";
import FullPageLoadingSpinner from "components/common/FullPageLoadingSpinner";
import ImageWithPlaceholder from "components/common/ImageWithPlaceholder";
import { WidthWrapper } from "components/common/WidthContainer";

import { useQuery } from "@tanstack/react-query";
import { queryArtist, queryTrackGroup } from "queries";
import Confetti from "components/Merch/Confetti";
import { useMemo } from "react";
import { getTrackUrl } from "utils/artist";

function CheckoutComplete() {
  const { t } = useTranslation("translation", {
    keyPrefix: "trackGroupDetails",
  });

  const { artistId, trackGroupId, trackId } = useParams();
  const { data: artist, isLoading: isLoadingArtist } = useQuery(
    queryArtist({ artistSlug: artistId ?? "" })
  );
  const { data: trackGroup, isLoading: isLoadingTrackGroup } = useQuery(
    queryTrackGroup({ albumSlug: trackGroupId ?? "", artistId })
  );

  const track = useMemo(
    () => trackGroup?.tracks.find((t) => t.id === Number(trackId)),
    [trackGroup, trackId]
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

  if (!track && !isLoadingTrackGroup) {
    return <Box>{t("doesNotExist")}</Box>;
  } else if (!track) {
    return <FullPageLoadingSpinner />;
  }

  return (
    <WidthWrapper
      variant="medium"
      className={css`
        margin-top: 4rem !important;
        align-items: center;

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
      <h1>Purchase complete!</h1>
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
        <ImageWithPlaceholder
          src={trackGroup.cover?.sizes?.[300]}
          alt={trackGroup.title}
          size={300}
        />
        <div
          className={css`
            margin-left: 1rem;
            display: flex;
            flex-direction: column;

            justify-content: flex-start;
          `}
        >
          <Trans
            t={t}
            i18nKey="youveBoughtTrack"
            components={{
              linkToTrack: (
                <Link to={getTrackUrl(artist, trackGroup, track)}></Link>
              ),
              linkToCollection: <Link to="/collection"></Link>,
            }}
            values={{ trackName: track.title }}
          />
          <Confetti />
        </div>
      </div>
    </WidthWrapper>
  );
}

export default CheckoutComplete;
