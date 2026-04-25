import { useQuery, useQueryClient } from "@tanstack/react-query";
import LoadingBlocks from "components/Artist/LoadingBlocks";
import BackToArtistLink from "components/ManageArtist/BackToArtistLink";
import {
  queryManagedArtist,
  queryManagedArtistSubscriptionTier,
} from "queries";
import React from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";

import SubscriptionForm from "./SubscriptionForm";

const ManageSubscriptionTierPage: React.FC = () => {
  const { artistId, tierId } = useParams();
  const { t } = useTranslation("translation", {
    keyPrefix: "subscriptionForm",
  });
  const queryClient = useQueryClient();

  const { data: artist } = useQuery(queryManagedArtist(Number(artistId)));

  const { data: tier, isLoading } = useQuery(
    queryManagedArtistSubscriptionTier({
      artistId: Number(artistId),
      tierId: Number(tierId),
    })
  );

  const handleReload = async () => {
    await queryClient.invalidateQueries({
      queryKey: queryManagedArtistSubscriptionTier({
        artistId: Number(artistId),
        tierId: Number(tierId),
      }).queryKey,
    });
  };

  if (isLoading || !artist) {
    return <LoadingBlocks rows={5} />;
  }

  return (
    <div className="p-4">
      <BackToArtistLink subPage="tiers" />
      <h1 className="text-xl font-bold mb-4">
        {tier?.name || t("newSubscriptionTier")}
      </h1>
      <SubscriptionForm artist={artist} existing={tier} reload={handleReload} />
    </div>
  );
};

export default ManageSubscriptionTierPage;
