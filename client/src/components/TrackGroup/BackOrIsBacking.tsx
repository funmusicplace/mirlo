import { useQuery } from "@tanstack/react-query";
import { moneyDisplay } from "components/common/Money";
import { queryUserStripeStatus } from "queries";
import React from "react";
import { useSearchParams } from "react-router-dom";
import api from "services/api";
import PurchaseOrDownloadAlbum from "./PurchaseOrDownloadAlbumModal";
import { css } from "@emotion/css";
import Confetti from "components/common/Confetti";
import BackingThisProject from "./BackingThisProject";

const BackOrIsBacking: React.FC<{ trackGroup: TrackGroup; artist: Artist }> = ({
  trackGroup,
  artist,
}) => {
  const { data: stripeAccountStatus, isFetching } = useQuery(
    queryUserStripeStatus(trackGroup.artist?.userId ?? 0)
  );
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [paymentStatus, setPaymentStatus] = React.useState<string | null>(null);
  const [paymentIntentAmount, setPaymentIntentAmount] = React.useState<
    number | null
  >(null);
  const [searchParams] = useSearchParams();

  const setupIntent = searchParams.get("setup_intent");

  const callback = async (
    setupIntent: string | null,
    stripeAccountId: string
  ) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("setupIntent", setupIntent || "");
      params.append("stripeAccountId", stripeAccountId);
      const response = await api.get<{
        status: string;
        paymentIntentAmount: number | null;
      }>(`stripe/setupIntentStatus?${params.toString()}`);
      setPaymentStatus(response.result.status);
      setPaymentIntentAmount(response.result.paymentIntentAmount);
    } catch (e) {
      console.error("Error fetching setup intent status:", e);
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    if (setupIntent && stripeAccountStatus?.stripeAccountId) {
      callback(setupIntent, stripeAccountStatus.stripeAccountId);
    } else if (!isFetching && !setupIntent) {
      setIsLoading(false);
    }
  }, [
    artist.id,
    trackGroup.id,
    setupIntent,
    stripeAccountStatus?.stripeAccountId,
  ]);

  return (
    <>
      {isLoading && <div>Loading...</div>}
      {!isLoading && (
        <>
          {paymentStatus === "succeeded" && paymentIntentAmount && (
            <BackingThisProject
              amount={paymentIntentAmount}
              currency={trackGroup?.currency}
            />
          )}
          {!paymentStatus && (
            <PurchaseOrDownloadAlbum trackGroup={trackGroup} />
          )}
        </>
      )}
    </>
  );
};

export default BackOrIsBacking;
