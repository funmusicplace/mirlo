import Box from "components/common/Box";
import React from "react";
import api from "../../services/api";
import { Trans, useTranslation } from "react-i18next";
import WidthContainer from "components/common/WidthContainer";
import { useAuthContext } from "state/AuthContext";
import ImageWithPlaceholder from "components/common/ImageWithPlaceholder";
import { moneyDisplay } from "components/common/Money";
import { Link } from "react-router-dom";
import {
  getArtistUrl,
  getMerchUrl,
  getReleaseUrl,
  getTrackUrl,
} from "utils/artist";
import { bp } from "../../constants";
import { formatDate } from "components/TrackGroup/ReleaseDate";
import { css } from "@emotion/css";
import {
  isMerchPurchase,
  isTrackGroupPurchase,
  isTrackPurchase,
} from "types/typeguards";

const PurchaseComponent: React.FC<{
  title: string;
  url: string;
  imageSrc?: string;
  pricePaid: number;
  currencyPaid: string;
  artist: Artist;
  purchaseDate: string;
}> = ({
  title,
  imageSrc,
  pricePaid,
  currencyPaid,
  artist,
  url,
  purchaseDate,
}) => {
  const { t, i18n } = useTranslation("translation", { keyPrefix: "profile" });

  return (
    <>
      <div
        className={css`
          display: flex;
          align-items: center;

          > div {
            margin-right: 1rem;
          }
        `}
      >
        {imageSrc && (
          <div>
            <ImageWithPlaceholder alt={title ?? ""} size={50} src={imageSrc} />
          </div>
        )}
        <div>
          <Trans
            t={t}
            i18nKey="albumLink"
            values={{ albumTitle: title, artistName: artist.name }}
            components={{
              albumLink: <Link to={url}></Link>,
              artistLink: <Link to={getArtistUrl(artist)}></Link>,
            }}
          />
          <div
            className={css`
              margin-top: 0.2rem;
              color: var(--mi-lighter-foreground-color);
              font-style: italic;
            `}
          >
            {t("purchasedOn", {
              date: formatDate({
                date: purchaseDate,
                i18n,
                options: { day: "numeric", month: "long", year: "numeric" },
              }),
            })}
          </div>
        </div>
      </div>
      <span>
        {t("paid", {
          amount: moneyDisplay({
            amount: pricePaid / 100,
            currency: currencyPaid,
          }),
        })}
      </span>
    </>
  );
};

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
                {purchases.map((p) => (
                  <li>
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
                    {isTrackGroupPurchase(p) && p.trackGroup && (
                      <PurchaseComponent
                        title={p.trackGroup.title}
                        imageSrc={p.trackGroup.cover?.sizes?.[60]}
                        currencyPaid={p.currencyPaid}
                        pricePaid={p.pricePaid}
                        artist={p.trackGroup.artist}
                        url={getReleaseUrl(p.trackGroup.artist, p.trackGroup)}
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
