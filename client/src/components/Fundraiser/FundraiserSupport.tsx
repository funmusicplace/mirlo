import { useQuery } from "@tanstack/react-query";
import LoadingBlocks from "components/Artist/LoadingBlocks";
import { moneyDisplay } from "components/common/Money";
import TipArtist from "components/common/TipArtist";
import { queryUserStripeStatus, useInvalidateFundraisers } from "queries";
import React from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { useAuthContext } from "state/AuthContext";
import { getFundraiserUrl } from "utils/artist";

import FundraiserPledgeForm from "./FundraiserPledgeForm";

const FundraiserSupport: React.FC<{ fundraiser: PublicFundraiser }> = ({
  fundraiser,
}) => {
  const { t } = useTranslation("translation", { keyPrefix: "fundraiserPage" });
  const { user, refreshLoggedInUser } = useAuthContext();
  const invalidate = useInvalidateFundraisers();
  const [searchParams, setSearchParams] = useSearchParams();
  const [justPledged, setJustPledged] = React.useState(
    searchParams.get("redirect_status") === "succeeded"
  );
  const { artist } = fundraiser;
  const { data: stripeAccountStatus, isPending } = useQuery(
    queryUserStripeStatus(artist.paymentToUserId ?? artist.userId)
  );

  const onPledged = React.useCallback(() => {
    setJustPledged(true);
    refreshLoggedInUser();
    invalidate();
  }, [refreshLoggedInUser, invalidate]);

  React.useEffect(() => {
    if (searchParams.get("setup_intent")) {
      setSearchParams({}, { replace: true });
      if (searchParams.get("redirect_status") === "succeeded") {
        onPledged();
      }
    }
  }, [searchParams, setSearchParams, onPledged]);

  if (!fundraiser.isAllOrNothing) {
    return <TipArtist artistId={artist.id} />;
  }

  if (fundraiser.status !== "ACTIVE") {
    return <p>{t("ended")}</p>;
  }

  if (justPledged) {
    return <p className="font-semibold">{t("thanksForPledging")}</p>;
  }

  const pledge = user?.pledges?.find((p) => p.fundraiserId === fundraiser.id);
  if (pledge) {
    return (
      <p>
        {t("youPledged", {
          amount: moneyDisplay({
            amount: pledge.amount / 100,
            currency: artist.user?.currency,
          }),
        })}
      </p>
    );
  }

  if (isPending) {
    return <LoadingBlocks height="3rem" margin="1rem" />;
  }

  if (!stripeAccountStatus?.chargesEnabled) {
    return <p>{t("artistNotSetUp", { artistName: artist.name })}</p>;
  }

  return (
    <FundraiserPledgeForm
      fundraiser={fundraiser}
      platformPercent={
        fundraiser.trackGroups[0]?.platformPercent ??
        artist.defaultPlatformFee ??
        0
      }
      returnUrl={`${window.location.origin}${getFundraiserUrl(artist, fundraiser)}`}
      onPledged={onPledged}
    />
  );
};

export default FundraiserSupport;
