import { useQuery } from "@tanstack/react-query";
import SubscriptionTierPage from "components/Artist/SubscriptionTierPage";
import Box from "components/common/Box";
import FullPageLoadingSpinner from "components/common/FullPageLoadingSpinner";
import { MetaCard } from "components/common/MetaCard";
import { queryArtistSubscriptionTier } from "queries";
import React from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useParams } from "react-router-dom";
import { getArtistTiersUrl } from "utils/artist";
import useArtistQuery from "utils/useArtistQuery";

const Index: React.FC = () => {
  const { t } = useTranslation("translation", { keyPrefix: "artist" });
  const { artistId, tierId } = useParams();
  const { data: artist, isLoading } = useArtistQuery();
  const { data: subscriptionTier, isLoading: isLoadingTier } = useQuery(
    queryArtistSubscriptionTier({ artistSlug: artistId, tierId })
  );

  if ((!artist && isLoading) || (!subscriptionTier && isLoadingTier)) {
    return <FullPageLoadingSpinner />;
  }

  if (!artist) {
    return <Box>{t("tierDoesNotExist")}</Box>;
  }

  if (!subscriptionTier) {
    return <Navigate to={getArtistTiersUrl(artist)} replace />;
  }

  return (
    <>
      <MetaCard
        title={`${subscriptionTier.name} | ${artist.name}`}
        description={subscriptionTier.description}
        image={subscriptionTier.images?.[0]?.image.sizes?.[1250]}
      />
      <SubscriptionTierPage
        subscriptionTier={subscriptionTier}
        artist={artist}
      />
    </>
  );
};

export default Index;
