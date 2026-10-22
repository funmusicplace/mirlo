import Box from "components/common/Box";
import PurchaseElements from "components/common/Purchase/PurchaseElements";
import { WidthWrapper } from "components/common/WidthContainer";
import React from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";

const Index: React.FC = () => {
  const { t } = useTranslation("translation", { keyPrefix: "billing" });
  const [searchParams] = useSearchParams();
  const [isPaid, setIsPaid] = React.useState(
    searchParams.get("redirect_status") === "succeeded"
  );

  const clientSecret = searchParams.get("clientSecret");
  const stripeAccountId = searchParams.get("stripeAccountId");

  if (isPaid || !clientSecret || !stripeAccountId) {
    return (
      <WidthWrapper variant="small" className="mt-8">
        <Box>{t(isPaid ? "paymentSubmitted" : "noPaymentFound")}</Box>
      </WidthWrapper>
    );
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
