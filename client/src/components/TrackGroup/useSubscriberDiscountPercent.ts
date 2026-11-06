import { useAuthContext } from "state/AuthContext";

const useSubscriberDiscountPercent = (
  artistId?: number,
  isDigital?: boolean
) => {
  const { user } = useAuthContext();
  const discountPercent = Math.max(
    0,
    ...(user?.artistUserSubscriptions ?? [])
      .filter(
        (subscription) =>
          subscription.artistSubscriptionTier.artistId === artistId
      )
      .map(
        (subscription) =>
          Number(
            subscription.artistSubscriptionTier[
              isDigital ? "digitalDiscountPercent" : "merchDiscountPercent"
            ]
          ) || 0
      )
  );
  return Math.min(100, discountPercent);
};

export default useSubscriberDiscountPercent;
