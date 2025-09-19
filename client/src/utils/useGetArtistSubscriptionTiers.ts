import { useQuery } from "@tanstack/react-query";
import { queryArtist } from "queries";
import { useAuthContext } from "state/AuthContext";

function useGetArtistSubscriptionTiers(urlSlug?: string) {
  const { user } = useAuthContext();

  const { data: artistDetails, ...props } = useQuery(
    queryArtist({ artistSlug: urlSlug ?? "", includeDefaultTier: true })
  );

  const currentTier =
    user?.artistUserSubscriptions?.find(
      (s) => s.artistSubscriptionTier.artistId === artistDetails?.id
    )?.artistSubscriptionTier || artistDetails?.subscriptionTiers?.length === 1
      ? artistDetails?.subscriptionTiers[0]
      : undefined;

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
