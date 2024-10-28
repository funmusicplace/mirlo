import { css } from "@emotion/css";
import Box from "components/common/Box";
import React from "react";
import api from "../../services/api";
import { Trans, useTranslation } from "react-i18next";
import WidthContainer from "components/common/WidthContainer";
import { useAuthContext } from "state/AuthContext";
import ImageWithPlaceholder from "components/common/ImageWithPlaceholder";
import { moneyDisplay } from "components/common/Money";
import { Link } from "react-router-dom";
import { getArtistUrl, getMerchUrl, getReleaseUrl } from "utils/artist";
import { bp } from "../../constants";
import { ReactElement } from "react-markdown/lib/react-markdown";
import { formatDate } from "components/TrackGroup/ReleaseDate";

function isTrackGroupPurchase(
  entity: unknown
): entity is UserTrackGroupPurchase {
  if (!entity) {
    return false;
  }
  return !!(entity as UserTrackGroupPurchase).trackGroup;
}

function isMerchPurchase(entity: unknown): entity is MerchPurchase {
  if (!entity) {
    return false;
  }
  return !!(entity as MerchPurchase).merch;
}

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
        <div>
          <ImageWithPlaceholder alt={title ?? ""} size={50} src={imageSrc} />
        </div>
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
            amount: pricePaid,
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

  const fetchPurchases = React.useCallback(async () => {
    const { results } = await api.getMany<
      UserTrackGroupPurchase | MerchPurchase
    >(`users/${userId}/purchases`);
    console.log("results", results);
    setPurchases(results);
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
        <WidthContainer variant="big" justify="center">
          <h1>{t("yourPurchases")}</h1>
          <div
            className={css`
              display: flex;
              width: 60%;
              flex-direction: row;
              flex-wrap: wrap;
              margin: 0 auto;

              @media screen and (max-width: ${bp.medium}px) {
                width: 100%;
              }
            `}
          >
            {!purchases ||
              (purchases?.length === 0 && <Box>{t("noPurchases")}</Box>)}
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
        </WidthContainer>
      </div>
    </>
  );
}

export default YourPurchases;
