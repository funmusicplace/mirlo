import { useQuery } from "@tanstack/react-query";
import { ArtistButton } from "components/Artist/ArtistButtons";
import { InputEl } from "components/common/Input";
import { moneyDisplay } from "components/common/Money";
import PurchaseModal from "components/common/Purchase/PurchaseModal";
import { usePurchase } from "components/common/Purchase/usePurchase";
import { queryCataloguePrice } from "queries";
import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useAuthContext } from "state/AuthContext";
import { buildCheckoutCompletePath } from "utils/artist";

const PurchaseCatalogueButton: React.FC<{ artist: Artist }> = ({ artist }) => {
  const { t } = useTranslation("translation", { keyPrefix: "artist" });
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const { checkout, isLoading, startPurchase, reset } = usePurchase();
  const [isEnteringCustomAmount, setIsEnteringCustomAmount] =
    React.useState(false);
  const [email, setEmail] = React.useState("");
  const { data } = useQuery(queryCataloguePrice({ artistId: artist.id }));
  const floorPrice = data?.price ?? 0;
  const [amount, setAmount] = React.useState((floorPrice / 100).toString());

  React.useEffect(() => {
    setAmount((floorPrice / 100).toString());
  }, [floorPrice]);

  const catalogueCompletePath = buildCheckoutCompletePath(artist, {
    purchaseType: "catalogue",
  });

  const purchaseCatalogue = React.useCallback(
    async (price: number) => {
      await startPurchase({
        artistId: artist.id,
        items: [{ type: "catalogue", price: String(price) }],
        email: user ? undefined : email,
      });
    },
    [artist, user, email, startPurchase]
  );

  if (!artist.user || !floorPrice) {
    return null;
  }

  const currency = artist.user.currency ?? "usd";

  return (
    <div className="flex flex-col items-center gap-2">
      {!user && (
        <InputEl
          type="email"
          placeholder={t("email") ?? ""}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      )}
      <ArtistButton
        size="big"
        wrap
        type="button"
        isLoading={isLoading}
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
            isLoading={isLoading}
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
      <PurchaseModal
        open={!!checkout}
        onClose={reset}
        clientSecret={checkout?.clientSecret}
        stripeAccountId={checkout?.stripeAccountId}
        returnUrl={`${window.location.origin}${catalogueCompletePath}`}
        onSuccess={() => navigate(catalogueCompletePath)}
        title={t("purchaseEntireCatalogue", {
          amount: moneyDisplay({ amount: Number(amount), currency }),
        })}
        buttonLabel={t("completePayment")}
      />
    </div>
  );
};

export default PurchaseCatalogueButton;
