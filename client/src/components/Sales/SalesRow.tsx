import { formatDate } from "components/TrackGroup/ReleaseDate";
import React from "react";
import { useTranslation } from "react-i18next";
import { moneyDisplay } from "components/common/Money";
import { Link } from "react-router-dom";
import { getMerchUrl, getReleaseUrl, getTrackUrl } from "utils/artist";
import { Sale } from "queries";

const SalesRow: React.FC<{
  sale: Sale;
}> = ({ sale }) => {
  const { i18n, t } = useTranslation("translation", {
    keyPrefix: "sales",
  });

  return (
    <tr>
      <td />
      <td>{sale.artist.name}</td>
      <td>
        {moneyDisplay({ amount: sale.amount / 100, currency: sale.currency })}
      </td>
      <td>{formatDate({ date: sale.datePurchased, i18n })} </td>
      <td>
        {sale.trackGroup
          ? t("trackGroup")
          : sale.merch
            ? t("merch")
            : sale.track
              ? t("track")
              : sale.artistSubscriptionTier
                ? t("subscription")
                : t("tip")}
      </td>
      <td>
        {sale.trackGroup ? (
          <span>
            <Link to={getReleaseUrl(sale.artist, sale.trackGroup)}>
              {sale.trackGroup.title}
            </Link>
          </span>
        ) : sale.merch ? (
          <span>
            <Link to={getMerchUrl(sale.artist, sale.merch)}>
              {sale.merch.title}
            </Link>
          </span>
        ) : sale.track ? (
          <span>
            <Link
              to={getTrackUrl(sale.artist, sale.track.trackGroup, sale.track)}
            >
              {sale.track.title}
            </Link>
          </span>
        ) : sale.artistSubscriptionTier ? (
          <span>
            {sale.artistSubscriptionTier.name}{" "}
            {sale.artistSubscriptionTier.interval}
          </span>
        ) : (
          <span>{t("tip")}</span>
        )}
      </td>
    </tr>
  );
};

export default SalesRow;
