import { css } from "@emotion/css";
import { useParams } from "react-router-dom";
import Box from "../common/Box";
import { useTranslation } from "react-i18next";
import Confetti from "components/common/Confetti";
import FullPageLoadingSpinner from "components/common/FullPageLoadingSpinner";
import ImageWithPlaceholder from "components/common/ImageWithPlaceholder";
import { WidthWrapper } from "components/common/WidthContainer";

import { useQuery } from "@tanstack/react-query";
import { queryArtist, queryTip } from "queries";

function TipArtist() {
  const { t } = useTranslation("translation", {
    keyPrefix: "tipArtist",
  });

  const { artistId, tipId } = useParams();
  const { data: artist, isLoading: isLoadingArtist } = useQuery(
    queryArtist({ artistSlug: artistId ?? "" })
  );

  if (!tipId) {
    return null;
  }
  const { data: tip, isLoading: isLoadingTip } = useQuery(
    queryTip({ tipId: tipId })
  );

  if (!artist && !isLoadingArtist) {
    return <Box>{t("doesNotExist")}</Box>;
  } else if (!artist) {
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
      <h1>You have successfully tipped this artist!</h1>
      <div
        className={css`
          display: flex;

          div:first-child {
            flex-grow: 1;
          }
        `}
      >
        <ImageWithPlaceholder
          src={artist.avatar?.sizes?.[120]}
          alt={artist.name}
          size={120}
        />
        <div
          className={css`
            margin-left: 1rem;
          `}
        >
          {" "}
          You've tipped {artist.name}! The artist has been notified.
        </div>
      </div>
      <Confetti />
    </WidthWrapper>
  );
}

export default TipArtist;
