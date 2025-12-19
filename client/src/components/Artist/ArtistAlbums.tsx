import { css } from "@emotion/css";
import React from "react";
import { useTranslation } from "react-i18next";
import ArtistTrackGroup from "./ArtistTrackGroup";
import { bp } from "../../constants";
import SpaceBetweenDiv from "components/common/SpaceBetweenDiv";
import { useParams } from "react-router-dom";
import TrackgroupGrid from "components/common/TrackgroupGrid";
import { useAuthContext } from "state/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { queryArtist, queryPublicLabelTrackGroups } from "queries";
import { NewAlbumButton } from "components/ManageArtist/NewAlbumButton";
import { ArtistButton } from "./ArtistButtons";
import { moneyDisplay } from "components/common/Money";
import api from "services/api";
import SortableArtistAlbums from "./SortableArtistAlbums";

const ArtistAlbums: React.FC = () => {
  const { user } = useAuthContext();
  const { t } = useTranslation("translation", {
    keyPrefix: "artist",
  });
  const { artistId } = useParams();
  const { data: artist } = useQuery(
    queryArtist({ artistSlug: artistId ?? "" })
  );

  const { data: releases } = useQuery(queryPublicLabelTrackGroups(artistId));

  const [loadingStripe, setLoadingStripe] = React.useState(false);

  const purchaseCatalogue = React.useCallback(async () => {
    if (!artist) return;
    try {
      setLoadingStripe(true);
      const response = await api.post<{}, { redirectUrl: string }>(
        `artists/${artist.id}/purchaseCatalogue`,
        {
          price: artist.purchaseEntireCatalogMinPrice,
        }
      );
      window.location.assign(response.redirectUrl);
    } catch (error) {
      console.error("Error purchasing catalogue:", error);
    }
  }, [artist]);

  if (!artist) {
    return null;
  }

  const hasArtistReleases = (artist.trackGroups?.length ?? 0) > 0;
  const hasLabelReleases = (releases?.results.length ?? 0) > 0;

  if (!hasArtistReleases && !hasLabelReleases && artist.userId !== user?.id) {
    return null;
  }

  return (
    <div
      style={{ marginTop: "0rem" }}
      className={css`
        margin-bottom: 2rem;
        @media screen and (max-width: ${bp.medium}px) {
          border-radius: 0;
          margin-bottom: 0rem;
        }
      `}
    >
      <SpaceBetweenDiv>
        <div />
        {artist.userId === user?.id && <NewAlbumButton artist={artist} />}
      </SpaceBetweenDiv>
      {!artist.isLabelProfile && <SortableArtistAlbums />}
      {artist.isLabelProfile && (
        <>
          <TrackgroupGrid
            gridNumber={"3"}
            wrap
            as="ul"
            role="list"
            aria-labelledby="artist-navlink-releases"
          >
            {releases?.results.map((release) => (
              <ArtistTrackGroup
                key={release.id}
                trackGroup={release}
                showArtist
              />
            ))}
          </TrackgroupGrid>
        </>
      )}
      <div
        className={css`
          margin-top: 2rem;
          display: flex;
          justify-content: center;
        `}
      >
        {artist.user && !!artist.purchaseEntireCatalogMinPrice && (
          <ArtistButton
            size="big"
            type="button"
            isLoading={loadingStripe}
            onClick={purchaseCatalogue}
          >
            {t("purchaseEntireCatalogue", {
              amount: moneyDisplay({
                amount: artist.purchaseEntireCatalogMinPrice / 100,
                currency: artist.user.currency ?? "usd",
              }),
            })}
          </ArtistButton>
        )}
      </div>
    </div>
  );
};

export default ArtistAlbums;
