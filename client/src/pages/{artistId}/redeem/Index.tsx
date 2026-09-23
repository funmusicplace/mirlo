import { css } from "@emotion/css";
import Box from "components/common/Box";
import FullPageLoadingSpinner from "components/common/FullPageLoadingSpinner";
import ImageWithPlaceholder from "components/common/ImageWithPlaceholder";
import { MetaCard } from "components/common/MetaCard";
import RedeemCodeForm from "components/common/RedeemCodeForm";
import SmallTileDetails from "components/common/SmallTileDetails";
import { WidthWrapper } from "components/common/WidthContainer";
import React from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import api from "services/api";
import useErrorHandler from "services/useErrorHandler";
import { useAuthContext } from "state/AuthContext";
import { getArtistUrl, getReleaseUrl } from "utils/artist";
import useArtistQuery from "utils/useArtistQuery";

import { bp } from "../../../constants";

type RedeemResult = UserTrackGroupPurchase & {
  trackGroup: { id: number; urlSlug?: string; title?: string };
};

/**
 * Redeems a code against any release by this artist, so an artist can hand out
 * a single `/artistname/redeem` address instead of one per release (#577).
 */
function Index() {
  const { t } = useTranslation("translation", {
    keyPrefix: "trackGroupDetails",
  });
  const errorHandler = useErrorHandler();
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const { data: artist, isPending: isLoadingArtist } = useArtistQuery();

  const artistId = artist?.id;

  const redeemAlbum = React.useCallback(
    async (code: string, email: string) => {
      if (!artist) {
        return;
      }

      try {
        const result = await api.post<unknown, RedeemResult>(
          `artists/${artistId}/redeemCode`,
          { code, email }
        );

        const downloadQuery = new URLSearchParams({
          token: result.singleDownloadToken ?? "",
          email: result.user?.email ?? user?.email ?? email,
        });
        navigate(
          `${getReleaseUrl(artist, result.trackGroup)}/download?${downloadQuery.toString()}`
        );
      } catch (e) {
        errorHandler(e, {
          overrides: [
            {
              body: "Code not found or already used.",
              message: t("redeemCodeError"),
            },
            {
              body: "Need to be either logged in or supply email address",
              message: t("redeemCodeNeedEmail"),
            },
            { status: 429, message: t("redeemCodeRateLimited") },
          ],
        });
      }
    },
    [artist, artistId, errorHandler, navigate, t, user]
  );

  if (!artist && !isLoadingArtist) {
    return <Box>{t("artistDoesNotExist")}</Box>;
  } else if (!artist) {
    return <FullPageLoadingSpinner />;
  }

  return (
    <WidthWrapper variant="big">
      <MetaCard
        title={t("gotADownloadCode")}
        description={t("redeemForArtist", { artistName: artist.name })}
        image={artist.avatar?.sizes?.[600]}
      />
      <div
        className={css`
          margin-top: 5rem;
          margin-bottom: 5rem;
          @media screen and (max-width: ${bp.small}px) {
            margin-top: 2rem;
            margin-bottom: 2rem;
          }
        `}
      >
        <div
          className={css`
            display: flex;
            align-items: flex-start;
            justify-content: center;
            gap: 2rem;

            @media screen and (max-width: ${bp.small}px) {
              flex-direction: column-reverse;
              align-items: center;
            }
          `}
        >
          <ImageWithPlaceholder
            src={artist.avatar?.sizes?.[600]}
            size={600}
            alt=""
          />
          <div
            className={css`
              padding: 0 2rem;
              width: 50%;

              @media screen and (max-width: ${bp.small}px) {
                width: 100%;
              }
            `}
          >
            <h2>{t("gotADownloadCode")}</h2>

            <SmallTileDetails
              title={<Link to={getArtistUrl(artist)}>{artist.name}</Link>}
              textColor="var(--mi-text-color)"
              subtitle={t("redeemAnyReleaseByArtist")}
            />
            <RedeemCodeForm onRedeem={redeemAlbum} />
          </div>
        </div>
      </div>
    </WidthWrapper>
  );
}

export default Index;
