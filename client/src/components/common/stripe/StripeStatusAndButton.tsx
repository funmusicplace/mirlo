import React from "react";

import api from "services/api";
import Button from "../Button";
import { Trans, useTranslation } from "react-i18next";
import Box from "components/common/Box";
import { useAuthContext } from "state/AuthContext";
import { queryUserStripeStatus } from "queries";
import { useQuery } from "@tanstack/react-query";
import LoadingBlocks from "components/Artist/LoadingBlocks";

const StripeStatus = () => {
  const { user } = useAuthContext();
  const { t } = useTranslation("translation", { keyPrefix: "manage" });

  const userId = user?.id;

  const { data: stripeAccountStatus, isLoading: isLoadingStripe } = useQuery(
    queryUserStripeStatus(user?.id)
  );

  if (isLoadingStripe) return <LoadingBlocks rows={2} height="2rem" />;
  return (
    <>
      <p>{t("manageStripeStatus")}</p>
      {stripeAccountStatus?.detailsSubmitted && (
        <Box variant="info">
          {!stripeAccountStatus?.chargesEnabled &&
            stripeAccountStatus?.detailsSubmitted &&
            t("waitingStripeAccountVerification")}
          {stripeAccountStatus?.chargesEnabled && t("stripeAccountVerified")}
        </Box>
      )}
      {userId && (
        <a href={api.paymentProcessor.stripeConnect(userId)}>
          <Button>
            {stripeAccountStatus?.detailsSubmitted
              ? t("updateBankAccount")
              : t("setUpBankAccount")}
          </Button>
        </a>
      )}
      <p>
        <Trans
          i18nKey="payoutsInfo"
          components={{ link: <a href="https://docs.mirlo.space/payouts"></a> }}
        />
      </p>
    </>
  );
};

export default StripeStatus;
