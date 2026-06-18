import { css } from "@emotion/css";
import { useQuery } from "@tanstack/react-query";
import FollowArtistFromFediverse from "components/common/FollowArtistFromFediverse";
import FollowArtistWithEmail from "components/common/FollowArtistWithEmail";
import SupportArtistTiersForm from "components/common/SupportArtistTiersForm";
import TipArtistForm from "components/common/TipArtistForm";
import WidthContainer from "components/common/WidthContainer";
import { queryArtist, queryUserStripeStatus } from "queries";
import React from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { useAuthContext } from "state/AuthContext";

import { bp } from "../../constants";

import LoadingBlocks from "./LoadingBlocks";

const DividerWithText: React.FC<{ text: string }> = ({ text }) => (
  <div
    className={css`
      display: flex;
      justify-content: stretch;
      align-items: center;
      margin: 1rem 0;
      width: 100%;

      hr {
        flex-grow: 1;
        margin: 1rem;
        border-color: var(--mi-tint-x-color);
      }
    `}
  >
    <hr />
    {text}
    <hr />
  </div>
);

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

  const canReceivePayments = !!stripeAccountStatus?.chargesEnabled;

  return (
    <WidthContainer variant="medium">
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
          {canReceivePayments ? (
            <>
              <h2>{t("supportThisArtist")}</h2>
              <SupportArtistTiersForm artist={artist} excludeDefault />
              <DividerWithText text={t("orTipJustOnce")} />
              <TipArtistForm artist={artist} />
              <DividerWithText text={t("orFollowWithEmail")} />
            </>
          ) : (
            <h2>{t("followThisArtist")}</h2>
          )}
          <FollowArtistWithEmail artist={artist} />
          {artist.activityPub && (
            <>
              <DividerWithText text={t("orFollowFromFediverse")} />
              <FollowArtistFromFediverse artist={artist} />
            </>
          )}
        </div>
      </div>
    </WidthContainer>
  );
};

export default ArtistTip;
