import { css } from "@emotion/css";

import { useParams } from "react-router-dom";
import Box from "../common/Box";
import { useTranslation } from "react-i18next";
import FullPageLoadingSpinner from "components/common/FullPageLoadingSpinner";
import ImageWithPlaceholder from "components/common/ImageWithPlaceholder";

import { WidthWrapper } from "components/common/WidthContainer";

import { useAuthContext } from "state/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { queryArtist, queryMerch, queryUserStripeStatus } from "queries";

function TrackGroup() {
  const { t } = useTranslation("translation", {
    keyPrefix: "merchDetails",
  });

  const { artistId, merchId } = useParams();
  const { user } = useAuthContext();
  const { data: artist, isLoading: isLoadingArtist } = useQuery(
    queryArtist({ artistSlug: artistId ?? "" })
  );
  const { data: merch, isLoading: isLoadingMerch } = useQuery(
    queryMerch({ merchId: merchId ?? "" })
  );

  if (!artist && !isLoadingArtist) {
    return <Box>{t("doesNotExist")}</Box>;
  } else if (!artist) {
    return <FullPageLoadingSpinner />;
  }

  if (!merch && !isLoadingMerch) {
    return <Box>{t("doesNotExist")}</Box>;
  } else if (!merch) {
    return <FullPageLoadingSpinner />;
  }

  return (
    <WidthWrapper
      variant="small"
      className={css`
        margin-top: 4rem !important;
      `}
    >
      <h1>Purchase complete!</h1>
      <div
        className={css`
          display: flex;
          margin-top: 1rem;
        `}
      >
        <ImageWithPlaceholder
          src={merch.images?.[0]?.sizes?.[120]}
          alt={merch.title}
          size={120}
        />
        <div
          className={css`
            margin-left: 1rem;
          `}
        >
          {" "}
          You've bought {merch.title}! The artist has been notified.
        </div>
      </div>
    </WidthWrapper>
  );
}

export default TrackGroup;
