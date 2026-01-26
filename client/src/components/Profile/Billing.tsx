import React, { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { css } from "@emotion/css";
import EmbeddedStripe from "components/common/stripe/EmbeddedStripe";
import WidthContainer from "components/common/WidthContainer";

const Billing: React.FC = () => {
  const { t } = useTranslation("translation", { keyPrefix: "billing" });
  const [searchParams] = useSearchParams();

  const clientSecret = searchParams.get("clientSecret") || undefined;
  const stripeAccountId = searchParams.get("stripeAccountId") || undefined;

  if (!clientSecret || !stripeAccountId) {
    return (
      <WidthContainer variant="small">
        <div
          className={css`
            text-align: center;
            padding: 2rem;
          `}
        >
          <p>{t("noPaymentFound") ?? "No payment found"}</p>
        </div>
      </WidthContainer>
    );
  }

  return (
    <WidthContainer variant="small">
      <div
        className={css`
          padding: 2rem 0;
        `}
      >
        <h2>{t("completePayment") ?? "Complete Your Payment"}</h2>
        <div
          className={css`
            margin-top: 2rem;
          `}
        >
          <EmbeddedStripe
            clientSecret={clientSecret}
            stripeAccountId={stripeAccountId}
          />
        </div>
      </div>
    </WidthContainer>
  );
};

export default Billing;
