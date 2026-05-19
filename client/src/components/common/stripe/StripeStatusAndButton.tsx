import { useQuery, useQueryClient } from "@tanstack/react-query";
import LoadingBlocks from "components/Artist/LoadingBlocks";
import Box from "components/common/Box";
import { queryUserStripeStatus } from "queries";
import { MirloFetchError } from "queries/fetch/MirloFetchError";
import React from "react";
import { Trans, useTranslation } from "react-i18next";
import api from "services/api";
import { useAuthContext } from "state/AuthContext";

import Button from "../Button";

import ResetStripeAccountModal from "./ResetStripeAccountModal";

const StripeStatus = () => {
  const { user } = useAuthContext();
  const { t } = useTranslation("translation", { keyPrefix: "manage" });
  const queryClient = useQueryClient();

  const userId = user?.id;

  const {
    data: stripeAccountStatus,
    isLoading: isLoadingStripe,
    isError: stripeStatusError,
    error: stripeError,
  } = useQuery(queryUserStripeStatus(user?.id));

  const isStripeGone =
    stripeError instanceof MirloFetchError && stripeError.status === 403;

  if (isLoadingStripe) return <LoadingBlocks rows={2} height="2rem" />;

  const handleReset = () => {
    queryClient.invalidateQueries({ queryKey: ["fetchUserStripeStatus"] });
  };

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
      {stripeStatusError && (
        <Box variant="warning">{t("stripeAccountUnreachable")}</Box>
      )}
      <div className="flex gap-2">
        {!isStripeGone &&
          userId && ( // if isStripeGone then we should show the resetStripeAccount button.
            <a href={api.paymentProcessor.stripeConnect(userId)}>
              <Button>
                {stripeAccountStatus?.detailsSubmitted
                  ? t("updateBankAccount")
                  : t("setUpBankAccount")}
              </Button>
            </a>
          )}
        {userId && user?.email && (
          <ResetStripeAccountModal
            userId={userId}
            userEmail={user.email}
            onReset={handleReset}
          />
        )}
      </div>
      <p>
        <Trans
          t={t}
          i18nKey="payoutsInfo"
          components={{
            payoutsLink: (
              <a
                href="https://docs.mirlo.space/payouts"
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 hover:underline"
              >
                Content
              </a>
            ),
          }}
        />
      </p>
    </div>
  );
};

export default StripeStatus;
