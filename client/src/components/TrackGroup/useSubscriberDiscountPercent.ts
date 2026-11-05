import { useAuthContext } from "state/AuthContext";

const useSubscriberDiscountPercent = (
  artistId?: number,
  isDigital?: boolean
) => {
  const { user } = useAuthContext();
  const subscription = user?.artistUserSubscriptions?.find(
    (subscription) => subscription.artistSubscriptionTier.artistId === artistId
  );
  const discountPercent =
    subscription?.artistSubscriptionTier[
      isDigital ? "digitalDiscountPercent" : "merchDiscountPercent"
    ] ?? 0;
  return Math.min(100, Math.max(0, Number(discountPercent) || 0));
};

export default useSubscriberDiscountPercent;
