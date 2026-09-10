import { useQuery } from "@tanstack/react-query";
import { ArtistButton } from "components/Artist/ArtistButtons";
import { moneyDisplay } from "components/common/Money";
import PurchaseModal from "components/common/Purchase/PurchaseModal";
import { usePurchase } from "components/common/Purchase/usePurchase";
import { queryCataloguePrice } from "queries";
import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { buildCheckoutCompletePath } from "utils/artist";

const PurchaseCatalogueButton: React.FC<{ artist: Artist }> = ({ artist }) => {
  const { t } = useTranslation("translation", { keyPrefix: "artist" });
  const navigate = useNavigate();
  const { checkout, isLoading, startPurchase, reset } = usePurchase();
  const { data } = useQuery(queryCataloguePrice({ artistId: artist.id }));
  const floorPrice = data?.price ?? 0;

  const purchaseCatalogue = React.useCallback(async () => {
    await startPurchase({
      artistId: artist.id,
      items: [{ type: "catalogue", price: String(floorPrice) }],
    });
  }, [artist, floorPrice, startPurchase]);

  if (!artist.user || !floorPrice) {
    return null;
  }

  const currency = artist.user.currency ?? "usd";
  const title = t("purchaseEntireCatalogue", {
    amount: moneyDisplay({ amount: floorPrice / 100, currency }),
  });

  const completePath = (buyerEmail?: string) =>
    buildCheckoutCompletePath(artist, {
      purchaseType: "catalogue",
      ...(buyerEmail && { email: buyerEmail }),
    });

  return (
    <div className="flex flex-col items-center gap-2">
      <ArtistButton
        size="big"
        wrap
        type="button"
        isLoading={isLoading}
        onClick={purchaseCatalogue}
      >
        {title}
      </ArtistButton>
      <PurchaseModal
        open={!!checkout}
        onClose={reset}
        clientSecret={checkout?.clientSecret}
        stripeAccountId={checkout?.stripeAccountId}
        returnUrl={`${window.location.origin}${completePath()}`}
        onSuccess={(buyerEmail) => navigate(completePath(buyerEmail))}
        title={title}
        buttonLabel={t("completePayment")}
      />
    </div>
  );
};

export default PurchaseCatalogueButton;
