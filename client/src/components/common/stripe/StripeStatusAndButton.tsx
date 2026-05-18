import { useQuery } from "@tanstack/react-query";
import LoadingBlocks from "components/Artist/LoadingBlocks";
import Box from "components/common/Box";
import { queryUserStripeStatus } from "queries";
import React from "react";
import { Trans, useTranslation } from "react-i18next";
import api from "services/api";
import { useAuthContext } from "state/AuthContext";

import Button from "../Button";

const StripeStatus = () => {
  const { user } = useAuthContext();
  const { t } = useTranslation("translation", { keyPrefix: "manage" });

  const userId = user?.id;

  const { data: stripeAccountStatus, isLoading: isLoadingStripe } = useQuery(
    queryUserStripeStatus(user?.id)
  );

  if (isLoadingStripe) return <LoadingBlocks rows={2} height="2rem" />;
  return (
    <div className="flex flex-col gap-4">
      <p>{t("manageStripeStatus")}</p>
      {stripeAccountStatus?.detailsSubmitted && (
        <Box variant="info">
          {!stripeAccountStatus?.chargesEnabled &&
            stripeAccountStatus?.detailsSubmitted &&
            t("waitingStripeAccountVerification")}
          {stripeAccountStatus?.chargesEnabled && (
            <Trans
              t={t}
              i18nKey="stripeAccountVerified"
              components={{ strong: <strong /> }}
            />
          )}
          {stripeAccountStatus?.defaultCurrency && (
            <p>
              <Trans
                t={t}
                i18nKey="payoutCurrency"
                values={{ currency: stripeAccountStatus.defaultCurrency }}
                components={{ strong: <strong /> }}
              />
            </p>
          )}
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
          t={t}
          i18nKey="payoutsInfo"
          components={{
            link: (
              <a
                href="https://docs.mirlo.space/payouts"
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 hover:underline"
              ></a>
            ),
          }}
        />
      </p>
    </div>
  );
};

export default StripeStatus;
