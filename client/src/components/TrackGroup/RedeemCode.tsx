import { css } from "@emotion/css";

import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
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
import api from "services/api";
import { getArtistUrl, getReleaseUrl } from "utils/artist";
import { useAuthContext } from "state/AuthContext";
import { useQuery } from "@tanstack/react-query";
import useArtistQuery from "utils/useArtistQuery";
import { queryTrackGroup } from "queries";
import {
  ArtistButton,
  useGetArtistColors,
} from "components/Artist/ArtistButtons";
import { bp } from "../../constants";

function RedeemCode() {
  const { t } = useTranslation("translation", {
    keyPrefix: "trackGroupDetails",
  });
  const { colors } = useGetArtistColors();

  const { user } = useAuthContext();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [code, setCode] = React.useState(params.get("code") ?? "");
  const [email, setEmail] = React.useState("");
  const { artistId, trackGroupId } = useParams();
  const { data: artist, isPending: isLoadingArtist } = useArtistQuery();

  const { data: trackGroup, isLoading: isLoadingTrackGroup } = useQuery(
    queryTrackGroup({ albumSlug: trackGroupId, artistId: artistId })
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
  console.log("sizes", trackGroup.cover?.sizes);

  return (
    <WidthWrapper variant="big">
      <MetaCard
        title={trackGroup.title ?? "Untitled release"}
        description={trackGroup.about ?? "An album on Mirlo"}
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
            alt={trackGroup.title ?? "Untitled release"}
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
              textColor={colors?.foreground}
              subtitle={
                <Link to={getArtistUrl(trackGroup.artist)}>
                  {trackGroup.artist?.name ?? ""}
                </Link>
              }
            />
            <FormComponent
              className={css`
                margin-top: 2rem !important;

                label {
                  font-size: 1.25rem !important;
                }

                input {
                  max-width: 300px;
                }
              `}
            >
              <label>{t("enterDownloadCode")}</label>
              <InputEl
                colors={colors}
                className={css`
                  margin-bottom: 1rem;
                `}
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
              {!user && (
                <FormComponent>
                  <label>{t("yourEmail")}</label>
                  <InputEl
                    colors={colors}
                    className={css`
                      margin-bottom: 1rem;
                    `}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </FormComponent>
              )}
              <ArtistButton onClick={() => redeemAlbum(code, email)}>
                {t("redeem")}
              </ArtistButton>
            </FormComponent>
          </div>
        </div>
      </div>
    </WidthWrapper>
  );
}

export default RedeemCode;
