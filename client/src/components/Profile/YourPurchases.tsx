import { css } from "@emotion/css";
import WidthContainer from "components/common/WidthContainer";
import React from "react";
import { useTranslation } from "react-i18next";
import { useAuthContext } from "state/AuthContext";
import { isUserTransaction } from "types/typeguards";
import { getArtistUrl } from "utils/artist";

import api from "../../services/api";

import PurchaseComponent from "./PurchaseComponent";
import TransactionComponent from "./TransactionComponent";

function YourPurchases() {
  const { user } = useAuthContext();
  const userId = user?.id;

  const [purchases, setPurchases] = React.useState<UserTransaction[]>();
  const { t } = useTranslation("translation", { keyPrefix: "profile" });
  const [charges, setCharges] =
    React.useState<ArtistUserSubscriptionCharge[]>();

  const fetchPurchases = React.useCallback(async () => {
    const { results } = await api.getMany<UserTransaction>(
      `users/${userId}/purchases`
    );
    setPurchases(results);
    const { results: fetchedCharges } =
      await api.getMany<ArtistUserSubscriptionCharge>(
        `users/${userId}/charges`
      );
    setCharges(fetchedCharges);
  }, [userId]);

  React.useEffect(() => {
    fetchPurchases();
  }, [fetchPurchases]);

  if (!user) {
    return null;
  }

  return (
    <div className="p-(--mi-side-paddings-xsmall)">
      <WidthContainer variant="big" justify="center">
        <div className="flex flex-wrap md:flex-nowrap gap-8 items-start p-4">
          <section className="flex-1 w-full min-w-0">
            <h1>{t("yourPurchases")}</h1>
            {(!purchases || purchases.length === 0) && (
              <p className="text-(--mi-secondary-text-color) mt-4">
                {t("noPurchases")}
              </p>
            )}
            {purchases && purchases.length > 0 && (
              <ol
                className={css`
                  padding: 1rem 0;
                  width: 100%;
                  list-style: none;

                  li {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 1rem;
                    border-bottom: 1px solid var(--mi-darken-x-background-color);

                    img {
                      min-width: 50px;
                    }
                  }

                  li:last-child {
                    border-bottom: none;
                  }
                `}
              >
                {purchases.map((p) => (
                  <li key={isUserTransaction(p) ? p.id : ""}>
                    {isUserTransaction(p) && (
                      <TransactionComponent userTransaction={p} />
                    )}
                  </li>
                ))}
              </ol>
            )}
            <p>{t("reimbursals")}</p>
          </section>

          {charges && charges.length > 0 && (
            <aside className="md:shrink-0 md:w-1/3 w-full min-w-0 rounded-xl bg-(--mi-darken-background-color) p-4">
              <h2 className="mt-0 text-base font-bold">
                {t("subscriptionCharges")}
              </h2>
              <ol
                className={css`
                  padding: 0;
                  margin-top: 0.75rem;
                  width: 100%;
                  list-style: none;

                  li {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 0.75rem 0;
                    border-bottom: 1px solid var(--mi-darken-x-background-color);
                  }

                  li:last-child {
                    border-bottom: none;
                  }
                `}
              >
                {charges.map((p) => (
                  <li key={p.id}>
                    {p.transaction && (
                      <PurchaseComponent
                        title={
                          p.artistUserSubscription.artistSubscriptionTier.name
                        }
                        currencyPaid={p.transaction?.currency}
                        pricePaid={p.transaction?.amount}
                        artist={
                          p.artistUserSubscription.artistSubscriptionTier.artist
                        }
                        url={getArtistUrl(
                          p.artistUserSubscription.artistSubscriptionTier.artist
                        )}
                        purchaseDate={p.createdAt}
                      />
                    )}
                  </li>
                ))}
              </ol>
            </aside>
          )}
        </div>
      </WidthContainer>
    </div>
  );
}

export default YourPurchases;
