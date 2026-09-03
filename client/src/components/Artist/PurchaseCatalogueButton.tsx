import { useQuery } from "@tanstack/react-query";
import { ArtistButton } from "components/Artist/ArtistButtons";
import { InputEl } from "components/common/Input";
import { moneyDisplay } from "components/common/Money";
import { queryCataloguePrice } from "queries";
import React from "react";
import { useTranslation } from "react-i18next";
import api from "services/api";

const PurchaseCatalogueButton: React.FC<{ artist: Artist }> = ({ artist }) => {
  const { t } = useTranslation("translation", { keyPrefix: "artist" });
  const [loadingStripe, setLoadingStripe] = React.useState(false);
  const [isEnteringCustomAmount, setIsEnteringCustomAmount] =
    React.useState(false);
  const { data } = useQuery(queryCataloguePrice({ artistId: artist.id }));
  const floorPrice = data?.price ?? 0;
  const [amount, setAmount] = React.useState((floorPrice / 100).toString());

  React.useEffect(() => {
    setAmount((floorPrice / 100).toString());
  }, [floorPrice]);

  const purchaseCatalogue = React.useCallback(
    async (price: number) => {
      try {
        setLoadingStripe(true);
        const response = await api.post<{}, { redirectUrl: string }>(
          `artists/${artist.id}/purchaseCatalogue`,
          { price }
        );
        window.location.assign(response.redirectUrl);
      } catch (error) {
        console.error("Error purchasing catalogue:", error);
        setLoadingStripe(false);
      }
    },
    [artist]
  );

  if (!artist.user || !floorPrice) {
    return null;
  }

  const currency = artist.user.currency ?? "usd";

  return (
    <div className="flex flex-col items-center gap-2">
      <ArtistButton
        size="big"
        wrap
        type="button"
        isLoading={loadingStripe}
        onClick={() => purchaseCatalogue(floorPrice)}
      >
        {t("purchaseEntireCatalogueAtLeast", {
          amount: moneyDisplay({ amount: floorPrice / 100, currency }),
        })}
      </ArtistButton>
      {!isEnteringCustomAmount && (
        <ArtistButton
          type="button"
          variant="link"
          onClick={() => setIsEnteringCustomAmount(true)}
        >
          {t("payMore")}
        </ArtistButton>
      )}
      {isEnteringCustomAmount && (
        <div className="flex items-center gap-2">
          <InputEl
            type="number"
            min={floorPrice / 100}
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <ArtistButton
            type="button"
            size="compact"
            isLoading={loadingStripe}
            onClick={() =>
              purchaseCatalogue(
                Math.max(Math.round(Number(amount) * 100), floorPrice)
              )
            }
          >
            {t("purchaseEntireCatalogue", {
              amount: moneyDisplay({ amount: Number(amount), currency }),
            })}
          </ArtistButton>
        </div>
      )}
    </div>
  );
};

export default PurchaseCatalogueButton;
