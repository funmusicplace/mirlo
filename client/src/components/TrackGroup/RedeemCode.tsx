import { css } from "@emotion/css";

import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import Box from "../common/Box";
import usePublicObjectById from "utils/usePublicObjectById";
import { useTranslation } from "react-i18next";
import FullPageLoadingSpinner from "components/common/FullPageLoadingSpinner";
import { MetaCard } from "components/common/MetaCard";
import { useArtistContext } from "state/ArtistContext";
import ImageWithPlaceholder from "components/common/ImageWithPlaceholder";

import { WidthWrapper } from "components/common/WidthContainer";

import SmallTileDetails from "components/common/SmallTileDetails";
import { InputEl } from "components/common/Input";
import Button from "components/common/Button";
import React from "react";
import FormComponent from "components/common/FormComponent";
import { useGlobalStateContext } from "state/GlobalState";
import api from "services/api";
import { getReleaseUrl } from "utils/artist";

function RedeemCode() {
  const { t } = useTranslation("translation", {
    keyPrefix: "trackGroupDetails",
  });

  const {
    state: { user },
  } = useGlobalStateContext();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [code, setCode] = React.useState(params.get("code") ?? "");
  const [email, setEmail] = React.useState("");

  const {
    state: { artist, isLoading: isLoadingArtist },
  } = useArtistContext();
  const { artistId, trackGroupId } = useParams();

  const { object: trackGroup, isLoadingObject: isLoadingTrackGroup } =
    usePublicObjectById<TrackGroup>(
      "trackGroups",
      trackGroupId,
      `?artistId=${artistId}`
    );

  const tId = trackGroup?.id;

  const redeemAlbum = React.useCallback(
    async (code: string, email: string) => {
      if (artist && trackGroup) {
        try {
          const result = await api.post<unknown, UserTrackGroupPurchase>(
            `trackGroups/${tId}/redeemCode`,
            {
              code,
              email,
            }
          );

          navigate(
            `${getReleaseUrl(artist, trackGroup)}/download?token=${
              result.singleDownloadToken
            }&email=${result.user?.email ?? user?.email ?? email}`
          );
        } catch (e) {}
      }
    },
    [artist, navigate, tId, trackGroup, user?.email]
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
    <WidthWrapper variant="small">
      <MetaCard
        title={trackGroup.title}
        description={trackGroup.about ?? "An album on Mirlo"}
        image={trackGroup.cover?.sizes?.[600]}
      />
      <div
        className={css`
          margin-top: 2rem;
        `}
      >
        <h2>Got a download code?</h2>
        <div
          className={css`
            display: flex;
          `}
        >
          <ImageWithPlaceholder
            src={trackGroup.cover?.sizes?.[120]}
            size={120}
            alt={trackGroup.title}
          />
          <SmallTileDetails
            title={trackGroup.title}
            subtitle={trackGroup.artist?.name ?? ""}
          />
        </div>
        <FormComponent>
          <label>Enter download code below:</label>
          <InputEl
            className={css`
              margin-bottom: 1rem;
            `}
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          {!user && (
            <FormComponent>
              <label>Your email:</label>
              <InputEl
                className={css`
                  margin-bottom: 1rem;
                `}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </FormComponent>
          )}
          <Button onClick={() => redeemAlbum(code, email)}>Redeem</Button>
        </FormComponent>
      </div>
    </WidthWrapper>
  );
}

export default RedeemCode;
