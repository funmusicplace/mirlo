import { css } from "@emotion/css";
import React from "react";
import { useTranslation } from "react-i18next";
import { bp } from "../../constants";

import { queryArtist, queryUserStripeStatus } from "queries";
import { useQuery } from "@tanstack/react-query";
import { Navigate, useParams } from "react-router-dom";
import LoadingBlocks from "./LoadingBlocks";
import TipArtistForm from "components/common/TipArtistForm";
import SupportArtistTiersForm from "components/common/SupportArtistTiersForm";
import { useAuthContext } from "state/AuthContext";
import { getArtistUrl } from "utils/artist";
import WidthContainer from "components/common/WidthContainer";

const ArtistTip: React.FC = () => {
  const { t } = useTranslation("translation", { keyPrefix: "artist" });
  const { artistId } = useParams();
  const { user } = useAuthContext();

  const { data: artist, isFetching } = useQuery(
    queryArtist({ artistSlug: artistId ?? "" })
  );

  const { data: stripeAccountStatus, isFetching: isFetchingStripe } = useQuery(
    queryUserStripeStatus(artist?.userId ?? 0)
  );
  if (isFetching || isFetchingStripe) {
    return <LoadingBlocks />;
  }

  if (!artist) {
    return null;
  }

  if (!stripeAccountStatus?.chargesEnabled) {
    return <Navigate to={getArtistUrl(artist)} />;
  }

  return (
    <WidthContainer variant="small">
      <div
        className={css`
          margin-bottom: 4rem;
          margin-top: 4rem;
          @media screen and (max-width: ${bp.medium}px) {
            padding: 0 0 7.5rem 0 !important;
          }
        `}
      >
        <div
          className={css`
            padding-bottom: 0.7rem;

            h2 {
              margin-top: 1rem;
              margin-bottom: 1rem;
              font-size: 1.2rem;
              font-weight: 600;
            }
          `}
        >
          <h2>{t("supportThisArtist")}</h2>
          <SupportArtistTiersForm artist={artist} excludeDefault={!!user} />
          <h2>{t("orTipJustOnce")}</h2>
          <TipArtistForm artist={artist} />
        </div>
      </div>
    </WidthContainer>
  );
};

export default ArtistTip;
