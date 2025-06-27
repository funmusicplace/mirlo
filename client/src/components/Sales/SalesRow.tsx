import { formatDate } from "components/TrackGroup/ReleaseDate";
import React from "react";
import { useTranslation } from "react-i18next";
import { Sale } from "./Sales";
import { moneyDisplay } from "components/common/Money";

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
        {sale.trackGroup ? (
          <span>{sale.trackGroup.title}</span>
        ) : sale.merch ? (
          <span>{sale.merch.title}</span>
        ) : sale.track ? (
          <span>{sale.track.title}</span>
        ) : sale.artistSubscriptionTier ? (
          <span>{sale.artistSubscriptionTier.name}</span>
        ) : (
          <span>{t("tip")}</span>
        )}
      </td>
    </tr>
  );
};

export default SalesRow;
