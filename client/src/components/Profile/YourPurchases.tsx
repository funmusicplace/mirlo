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
import {
  isMerchPurchase,
  isTrackGroupPurchase,
  isTrackPurchase,
  isUserTransaction,
} from "types/typeguards";
import PurchaseComponent from "./PurchaseComponent";
import { isUser } from "components/ManageArtist/UploadArtistImage";
import TransactionComponent from "./TransactionComponent";

function YourPurchases() {
  const { user } = useAuthContext();
  const userId = user?.id;

  const [purchases, setPurchases] =
    React.useState<(UserTrackGroupPurchase | MerchPurchase)[]>();
  const { t } = useTranslation("translation", { keyPrefix: "profile" });
  const [charges, setCharges] =
    React.useState<ArtistUserSubscriptionCharge[]>();

  const fetchPurchases = React.useCallback(async () => {
    const { results } = await api.getMany<
      UserTrackGroupPurchase | MerchPurchase
    >(`users/${userId}/purchases`);
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
                  <li
                    key={
                      isTrackPurchase(p)
                        ? p.track?.id
                        : isMerchPurchase(p)
                          ? p.merch?.id
                          : isUserTransaction(p)
                            ? p.id
                            : ""
                    }
                  >
                    {isUserTransaction(p) && (
                      <TransactionComponent userTransaction={p} />
                    )}
                    {isTrackPurchase(p) && p.track && (
                      <PurchaseComponent
                        title={p.track.title}
                        imageSrc={p.track.trackGroup.cover?.sizes?.[60]}
                        currencyPaid={p.currencyPaid}
                        pricePaid={p.pricePaid}
                        artist={p.track.trackGroup.artist}
                        url={getTrackUrl(
                          p.track.trackGroup.artist,
                          p.track.trackGroup,
                          p.track
                        )}
                        purchaseDate={p.datePurchased}
                      />
                    )}
                    {isMerchPurchase(p) && p.merch && (
                      <PurchaseComponent
                        title={p.merch.title}
                        imageSrc={p.merch.images[0]?.sizes?.[60]}
                        currencyPaid={p.currencyPaid}
                        pricePaid={p.amountPaid}
                        artist={p.merch.artist}
                        purchaseDate={p.createdAt}
                        url={getMerchUrl(p.merch.artist, p.merch)}
                        merchPurchase={p}
                      />
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
                  <li>
                    <PurchaseComponent
                      title={
                        p.artistUserSubscription.artistSubscriptionTier.name
                      }
                      currencyPaid={p.currency}
                      pricePaid={p.amountPaid}
                      artist={
                        p.artistUserSubscription.artistSubscriptionTier.artist
                      }
                      url={getArtistUrl(
                        p.artistUserSubscription.artistSubscriptionTier.artist
                      )}
                      purchaseDate={p.createdAt}
                    />
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
