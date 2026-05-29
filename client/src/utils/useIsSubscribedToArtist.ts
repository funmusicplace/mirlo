import { useAuthContext } from "state/AuthContext";

const useIsSubscribedToArtist = (artistId?: number) => {
  const { user } = useAuthContext();

  return !!user?.artistUserSubscriptions?.find(
    (aus) =>
      !aus.artistSubscriptionTier.isDefaultTier &&
      aus.artistSubscriptionTier.artistId === artistId
  );
};

export default useIsSubscribedToArtist;
