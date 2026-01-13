import React from "react";
import api from "../../services/api";
import { useTranslation } from "react-i18next";
import WidthContainer from "components/common/WidthContainer";
import { useAuthContext } from "state/AuthContext";

import {
  getArtistUrl,
  getMerchUrl,
  getReleaseUrl,
  getTrackUrl,
} from "utils/artist";
import { bp } from "../../constants";
import { css } from "@emotion/css";
import { isUserTransaction } from "types/typeguards";
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
    <>
      <div
        className={css`
          padding: var(--mi-side-paddings-xsmall);
        `}
      >
        <WidthContainer variant="medium" justify="center">
          <h1>{t("yourPurchases")}</h1>
          <div
            className={css`
              display: flex;
              width: 100%;
              flex-direction: row;
              flex-wrap: wrap;
              margin: 0 auto;

              @media screen and (max-width: ${bp.medium}px) {
                width: 100%;
              }
            `}
          >
            {!purchases || (purchases?.length === 0 && <>{t("noPurchases")}</>)}
            {purchases && (
              <ol
                className={css`
                  padding: 1rem;
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
          </div>
          <div>
            <p>{t("reimbursals")}</p>
          </div>
        </WidthContainer>
        <WidthContainer variant="medium" justify="center">
          <h1
            className={css`
              margin-top: 2rem !important;
            `}
          >
            {t("subscriptionCharges")}
          </h1>
          <div
            className={css`
              display: flex;
              width: 100%;
              flex-direction: row;
              flex-wrap: wrap;
              margin: 0 auto;

              @media screen and (max-width: ${bp.medium}px) {
                width: 100%;
              }
            `}
          >
            {!charges || (charges?.length === 0 && <>{t("noCharges")}</>)}
            {charges && (
              <ol
                className={css`
                  padding: 1rem;
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

                    span {
                      min-width: 200px;
                      text-align: right;
                    }
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
            )}
          </div>
        </WidthContainer>
      </div>
    </>
  );
}

export default YourPurchases;
