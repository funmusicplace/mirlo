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
import { queryArtist } from "queries";
import { NewAlbumButton } from "components/ManageArtist/NewAlbumButton";
import { ArtistButton } from "./ArtistButtons";
import Money from "components/common/Money";
import api from "services/api";
import { useSnackbar } from "state/SnackbarContext";
import FeatureFlag from "components/common/FeatureFlag";

const ArtistAlbums: React.FC = () => {
  const { user } = useAuthContext();
  const { t } = useTranslation("translation", {
    keyPrefix: "artist",
  });
  const { artistId } = useParams();
  const { data: artist } = useQuery(
    queryArtist({ artistSlug: artistId ?? "" })
  );

  const trackGroups = React.useMemo(
    () => artist?.trackGroups?.map((trackGroup) => ({ ...trackGroup, artist })),
    [artist]
  );

  const purchaseCatalogue = React.useCallback(async () => {
    if (!artist) return;
    try {
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

  if (
    !artist ||
    (artist.trackGroups.length === 0 && artist.userId !== user?.id)
  ) {
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
      <TrackgroupGrid
        gridNumber={"3"}
        wrap
        as="ul"
        role="list"
        aria-labelledby="artist-navlink-releases"
      >
        {trackGroups?.map((trackGroup) => (
          <ArtistTrackGroup
            key={trackGroup.id}
            trackGroup={trackGroup}
            as="li"
          />
        ))}
      </TrackgroupGrid>
      <div
        className={css`
          margin-top: 2rem;
          display: flex;
          justify-content: center;
        `}
      >
        <FeatureFlag featureFlag="cataloguePrice">
          {artist.user && artist.purchaseEntireCatalogMinPrice && (
            <ArtistButton size="big" type="button" onClick={purchaseCatalogue}>
              Purchase Entire Artist Catalogue for{" "}
              <Money
                currency={artist.user.currency ?? "usd"}
                amount={artist.purchaseEntireCatalogMinPrice / 100}
              />
            </ArtistButton>
          )}
        </FeatureFlag>
      </div>
    </div>
  );
};

export default ArtistAlbums;
