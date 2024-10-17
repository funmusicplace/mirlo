import { css } from "@emotion/css";

import { useParams } from "react-router-dom";
import Box from "../common/Box";
import { useTranslation } from "react-i18next";
import FullPageLoadingSpinner from "components/common/FullPageLoadingSpinner";
import ImageWithPlaceholder from "components/common/ImageWithPlaceholder";
import { WidthWrapper } from "components/common/WidthContainer";

import { useQuery } from "@tanstack/react-query";
import { queryArtist, queryMerch } from "queries";
import Confetti from "./Confetti";

function TrackGroup() {
  const { t } = useTranslation("translation", {
    keyPrefix: "merchDetails",
  });

  const { artistId, merchId } = useParams();
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

          div:first-child {
            flex-grow: 1;
          }
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
      <Confetti />
    </WidthWrapper>
  );
}

export default TrackGroup;
