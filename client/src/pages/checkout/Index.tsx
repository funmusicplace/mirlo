import { useQuery } from "@tanstack/react-query";
import Box from "components/common/Box";
import FullPageLoadingSpinner from "components/common/FullPageLoadingSpinner";
import { moneyDisplay } from "components/common/Money";
import PurchaseElements from "components/common/Purchase/PurchaseElements";
import { WidthWrapper } from "components/common/WidthContainer";
import { queryHostedCheckout } from "queries";
import { useTranslation } from "react-i18next";
import { Navigate, useSearchParams } from "react-router-dom";

/**
 * The Mirlo-hosted checkout page. External API consumers send a buyer here.
 */
function Index() {
  const { t } = useTranslation("translation", { keyPrefix: "hostedCheckout" });
  const [searchParams] = useSearchParams();
  const checkoutId = searchParams.get("checkoutId") ?? "";
  const { data, isError, isPending } = useQuery(
    queryHostedCheckout(checkoutId)
  );

  if (!checkoutId) {
    return (
      <WidthWrapper variant="small" className="mt-8">
        <Box>{t("missingParameters")}</Box>
      </WidthWrapper>
    );
  }

  if (isPending) {
    return <FullPageLoadingSpinner />;
  }

  if (data?.redirectUrl) {
    return <Navigate to={data.redirectUrl} replace />;
  }

  if (data?.success) {
    if (data.successUrl) {
      window.location.assign(data.successUrl);
      return <FullPageLoadingSpinner />;
    }
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
