import React from "react";
import { Trans, useTranslation } from "react-i18next";
import ImageWithPlaceholder from "components/common/ImageWithPlaceholder";
import { moneyDisplay } from "components/common/Money";
import { Link } from "react-router-dom";
import { getArtistUrl } from "utils/artist";
import { formatDate } from "components/TrackGroup/ReleaseDate";
import { css } from "@emotion/css";

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

export default PurchaseComponent;
