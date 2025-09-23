import { useQuery } from "@tanstack/react-query";
import { queryArtist } from "queries";
import { useAuthContext } from "state/AuthContext";

function useGetArtistSubscriptionTiers(urlSlug?: string) {
  const { user } = useAuthContext();

  const { data: artistDetails, ...props } = useQuery(
    queryArtist({ artistSlug: urlSlug ?? "", includeDefaultTier: true })
  );

  const userTierForArtist = user?.artistUserSubscriptions?.find(
    (s) => s.artistSubscriptionTier.artistId === artistDetails?.id
  );

  const currentTier =
    userTierForArtist?.artistSubscriptionTier ||
    artistDetails?.subscriptionTiers.find(
      (tier) => tier.id === userTierForArtist?.artistSubscriptionTierId
    );

  return {
    data: artistDetails,
    tiers: artistDetails?.subscriptionTiers ?? [],
    hasNonDefaultTiers: artistDetails?.subscriptionTiers?.some(
      (tier) => !tier.isDefaultTier
    ),
    currentTier,
    ...props,
  };
}

export default useGetArtistSubscriptionTiers;
