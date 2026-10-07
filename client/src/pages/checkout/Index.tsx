import Box from "components/common/Box";
import FullPageLoadingSpinner from "components/common/FullPageLoadingSpinner";
import { moneyDisplay } from "components/common/Money";
import PurchaseElements from "components/common/Purchase/PurchaseElements";
import { WidthWrapper } from "components/common/WidthContainer";
import { useOpenHostedCheckoutMutation } from "queries";
import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";

/**
 * The Mirlo-hosted checkout page. External API consumers send a buyer here.
 */
function Index() {
  const { t } = useTranslation("translation", { keyPrefix: "hostedCheckout" });
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const checkoutId = searchParams.get("checkoutId") ?? "";
  const { mutate, data, isError, isIdle, isPending } =
    useOpenHostedCheckoutMutation();
  const opened = React.useRef(false);

  React.useEffect(() => {
    if (checkoutId && !opened.current) {
      opened.current = true;
      mutate(checkoutId);
    }
  }, [checkoutId, mutate]);

  React.useEffect(() => {
    if (data?.redirectUrl) {
      navigate(data.redirectUrl);
    }
  }, [data?.redirectUrl, navigate]);

  if (!checkoutId) {
    return (
      <WidthWrapper variant="small" className="mt-8">
        <Box>{t("missingParameters")}</Box>
      </WidthWrapper>
    );
  }

  if (isIdle || isPending || data?.redirectUrl) {
    return <FullPageLoadingSpinner />;
  }

  if (data?.success) {
    return (
      <WidthWrapper variant="small" className="mt-8">
        <Box>{t("alreadyComplete")}</Box>
      </WidthWrapper>
    );
  }

  const quote = data?.deferred;
  if (isError || !quote) {
    return (
      <WidthWrapper variant="small" className="mt-8">
        <Box>{t("couldNotLoad")}</Box>
      </WidthWrapper>
    );
  }

  const returnUrl = quote.successUrl ?? window.location.origin;

  const total =
    quote.amount != null
      ? moneyDisplay({ amount: quote.amount / 100, currency: quote.currency })
      : null;

  const summary =
    quote.artistName && total
      ? t("payingArtistAmount", { artistName: quote.artistName, amount: total })
      : quote.artistName
        ? t("payingArtist", { artistName: quote.artistName })
        : total
          ? t("payingAmount", { amount: total })
          : null;

  return (
    <WidthWrapper variant="medium" className="mt-8 mb-12">
      <h1 className="text-xl mb-1">{t("title")}</h1>
      {summary && (
        <p className="mb-4 text-(--mi-lighten-foreground-color)">{summary}</p>
      )}
      <PurchaseElements
        checkout={{ kind: "deferred", quote }}
        returnUrl={returnUrl}
        buttonLabel={t("payNow")}
      />
    </WidthWrapper>
  );
}

export default Index;
