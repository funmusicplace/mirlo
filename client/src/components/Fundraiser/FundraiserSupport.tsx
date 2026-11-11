import { useQuery } from "@tanstack/react-query";
import { ArtistButton } from "components/Artist/ArtistButtons";
import LoadingBlocks from "components/Artist/LoadingBlocks";
import Modal from "components/common/Modal";
import { moneyDisplay } from "components/common/Money";
import TipArtist from "components/common/TipArtist";
import BackingThisProject from "components/TrackGroup/BackingThisProject";
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
  const [isPledging, setIsPledging] = React.useState(false);
  const [justPledged, setJustPledged] = React.useState(
    searchParams.get("redirect_status") === "succeeded"
  );
  const { artist } = fundraiser;
  const { data: stripeAccountStatus, isPending } = useQuery(
    queryUserStripeStatus(artist.paymentToUserId ?? artist.userId)
  );

  const onPledged = React.useCallback(() => {
    setIsPledging(false);
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

  const currency = fundraiser.currency ?? artist.user?.currency;
  const platformPercent =
    fundraiser.trackGroups[0]?.platformPercent ??
    artist.defaultPlatformFee ??
    0;

  const pledge = user?.pledges?.find((p) => p.fundraiserId === fundraiser.id);
  if (pledge) {
    return (
      <BackingThisProject
        amount={pledge.amount}
        currency={currency ?? "usd"}
        fundraiser={fundraiser}
        platformPercent={platformPercent}
        artistName={artist.name}
      />
    );
  }

  if (isPending) {
    return <LoadingBlocks height="3rem" margin="1rem" />;
  }

  if (!stripeAccountStatus?.chargesEnabled) {
    return <p>{t("artistNotSetUp", { artistName: artist.name })}</p>;
  }

  const stillToGo = fundraiser.goalAmount - fundraiser.amountRaised;

  return (
    <>
      <ArtistButton size="big" rounded onClick={() => setIsPledging(true)}>
        {t("pledge")}
      </ArtistButton>
      <Modal
        open={isPledging}
        onClose={() => setIsPledging(false)}
        title={fundraiser.name}
      >
        {stillToGo > 0 && (
          <p className="mb-4 font-semibold">
            {t("stillToGo", {
              amount: moneyDisplay({ amount: stillToGo / 100, currency }),
            })}
          </p>
        )}
        <FundraiserPledgeForm
          fundraiser={fundraiser}
          platformPercent={platformPercent}
          returnUrl={`${window.location.origin}${getFundraiserUrl(artist, fundraiser)}`}
          onPledged={onPledged}
        />
      </Modal>
    </>
  );
};

export default FundraiserSupport;
