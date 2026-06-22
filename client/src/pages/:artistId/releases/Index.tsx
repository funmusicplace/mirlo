import { css } from "@emotion/css";
import { useQuery } from "@tanstack/react-query";
import { moneyDisplay } from "components/common/Money";
import SectionActionStrip from "components/common/SectionActionStrip";
import TrackgroupGrid from "components/common/TrackgroupGrid";
import { NewAlbumButton } from "components/ManageArtist/NewAlbumButton";
import { queryArtist, queryPublicLabelTrackGroups } from "queries";
import React from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import api from "services/api";
import { useAuthContext } from "state/AuthContext";

import { bp } from "../../../constants";

import { ArtistButton } from "components/Artist/ArtistButtons";
import ReleaseCard from "components/common/ReleaseCard";
import SortableArtistAlbums from "components/Artist/SortableArtistAlbums";

const Index: React.FC = () => {
  const { user } = useAuthContext();
  const { t } = useTranslation("translation", {
    keyPrefix: "artist",
  });
  const { artistId } = useParams();
  const { data: artist } = useQuery(
    queryArtist({ artistSlug: artistId ?? "" })
  );

  const { data: labelTrackGroups } = useQuery(
    queryPublicLabelTrackGroups(artistId)
  );

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

  const releases = artist.isLabelProfile
    ? labelTrackGroups?.results
    : artist.trackGroups.map((tg) => ({ ...tg, artist }));

  const isArtistUserLoggedInUser = artist.userId === user?.id;

  if ((releases?.length ?? 0) === 0 && !isArtistUserLoggedInUser) {
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
      {isArtistUserLoggedInUser && (
        <SectionActionStrip tight>
          <NewAlbumButton artist={artist} />
        </SectionActionStrip>
      )}
      {isArtistUserLoggedInUser && !artist.isLabelProfile && (
        <SortableArtistAlbums />
      )}
      {(!isArtistUserLoggedInUser ||
        (isArtistUserLoggedInUser && artist.isLabelProfile)) && (
        <>
          <TrackgroupGrid
            gridNumber={"3"}
            wrap
            as="ul"
            role="list"
            aria-labelledby="artist-navlink-releases"
          >
            {releases?.map((release) => (
              <ReleaseCard
                key={release.id}
                trackGroup={release}
                showArtist={artist.isLabelProfile}
                headingLevel="h2"
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
            wrap
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

export default Index;
