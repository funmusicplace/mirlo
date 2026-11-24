import { css } from "@emotion/css";
import { useQuery } from "@tanstack/react-query";
import Box from "components/common/Box";
import FullPageLoadingSpinner from "components/common/FullPageLoadingSpinner";
import ImageWithPlaceholder from "components/common/ImageWithPlaceholder";
import { MetaCard } from "components/common/MetaCard";
import RedeemCodeForm from "components/common/RedeemCodeForm";
import SmallTileDetails from "components/common/SmallTileDetails";
import { WidthWrapper } from "components/common/WidthContainer";
import { queryTrackGroup } from "queries";
import React from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "services/api";
import useErrorHandler from "services/useErrorHandler";
import { useAuthContext } from "state/AuthContext";
import { useSnackbar } from "state/SnackbarContext";
import { getArtistUrl, getReleaseUrl } from "utils/artist";
import useArtistQuery from "utils/useArtistQuery";
import { useReleaseArtistName } from "utils/useReleaseArtistName";

import { bp } from "../../../../../constants";

function Index() {
  const { t } = useTranslation("translation", {
    keyPrefix: "trackGroupDetails",
  });
  const { releaseArtistName } = useReleaseArtistName();
  const snackbar = useSnackbar();
  const errorHandler = useErrorHandler();
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const { artistId, trackGroupId } = useParams();
  const { data: artist, isPending: isLoadingArtist } = useArtistQuery();

  const { data: trackGroup, isLoading: isLoadingTrackGroup } = useQuery(
    queryTrackGroup({ albumSlug: trackGroupId, artistId: artistId })
  );

  const tId = trackGroup?.id;

  const redeemAlbum = React.useCallback(
    async (code: string, email: string) => {
      if (artist && trackGroup) {
        if (!user && !email.trim()) {
          snackbar(t("redeemCodeNeedEmail"), { type: "warning" });
          return;
        }

        try {
          const result = await api.post<unknown, UserTrackGroupPurchase>(
            `trackGroups/${tId}/redeemCode`,
            {
              code,
              email,
            }
          );

          const downloadQuery = new URLSearchParams({
            token: result.singleDownloadToken ?? "",
            email: result.user?.email ?? user?.email ?? email,
          });
          navigate(
            `${getReleaseUrl(artist, trackGroup)}/download?${downloadQuery.toString()}`
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
      }
    },
    [artist, errorHandler, navigate, snackbar, t, tId, trackGroup, user]
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

  return (
    <WidthWrapper variant="big">
      <MetaCard
        title={trackGroup.title ?? t("untitledRelease")}
        description={trackGroup.about ?? t("releaseOnMirlo")}
        image={trackGroup.cover?.sizes?.[600]}
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
            src={trackGroup.cover?.sizes?.[600]}
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
              title={
                <Link to={getReleaseUrl(trackGroup.artist, trackGroup)}>
                  {trackGroup.title}
                </Link>
              }
              textColor="var(--mi-text-color)"
              subtitle={
                releaseArtistName(trackGroup) ? (
                  <Link to={getArtistUrl(trackGroup.artist)}>
                    {releaseArtistName(trackGroup)}
                  </Link>
                ) : (
                  ""
                )
              }
            />
            <RedeemCodeForm onRedeem={redeemAlbum} />
          </div>
        </div>
      </div>
    </WidthWrapper>
  );
}

export default Index;
