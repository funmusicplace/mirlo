import { useQuery } from "@tanstack/react-query";
import Box from "components/common/Box";
import FullPageLoadingSpinner from "components/common/FullPageLoadingSpinner";
import PurchaseElements from "components/common/Purchase/PurchaseElements";
import { WidthWrapper } from "components/common/WidthContainer";
import { queryPaymentIntentStatus } from "queries";
import { useStripePublishableKey } from "queries/instanceSettings";
import React from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";

const Index: React.FC = () => {
  const { t } = useTranslation("translation", { keyPrefix: "billing" });
  const [searchParams] = useSearchParams();
  const [isPaid, setIsPaid] = React.useState(false);
  const stripeKey = useStripePublishableKey();

  const clientSecret = searchParams.get("clientSecret") ?? "";
  const stripeAccountId = searchParams.get("stripeAccountId") ?? "";
  const { data: status, isError } = useQuery(
    queryPaymentIntentStatus({ clientSecret, stripeAccountId, stripeKey })
  );

  const message = (() => {
    if (isPaid) return "paymentSubmitted";
    if (!clientSecret || !stripeAccountId || isError) return "noPaymentFound";
    if (status === "succeeded") {
      return searchParams.has("redirect_status")
        ? "paymentSubmitted"
        : "alreadyPaid";
    }
    if (status === "processing") return "paymentProcessing";
    if (status === "canceled") return "noLongerDue";
  })();

  if (message) {
    return (
      <WidthWrapper variant="small" className="mt-8">
        <Box>{t(message)}</Box>
      </WidthWrapper>
    );
  }

  if (!status) {
    return <FullPageLoadingSpinner />;
  }

  return (
    <WidthWrapper variant="small" className="mt-8 mb-12">
      <h1 className="text-xl mb-4">{t("completePayment")}</h1>
      <PurchaseElements
        checkout={{ kind: "intent", clientSecret, stripeAccountId }}
        returnUrl={window.location.href}
        buttonLabel={t("payNow")}
        onSuccess={() => setIsPaid(true)}
      />
    </WidthWrapper>
  );
};

export default Index;
