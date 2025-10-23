import { formatDate } from "components/TrackGroup/ReleaseDate";
import React from "react";
import { useTranslation } from "react-i18next";
import { moneyDisplay } from "components/common/Money";
import { Link } from "react-router-dom";
import { getMerchUrl, getReleaseUrl, getTrackUrl } from "utils/artist";
import { Sale } from "queries";
import { FaExternalLinkAlt } from "react-icons/fa";

const SalesRow: React.FC<{
  sale: Sale;
}> = ({ sale }) => {
  const { i18n, t } = useTranslation("translation", {
    keyPrefix: "sales",
  });

  const shippingDestination = sale.merch?.shippingDestinations?.find(
    (dest) =>
      dest.destinationCountry?.toLowerCase() ===
      sale.shippingAddress?.country?.toLowerCase()
  );

  const hasShippingCost =
    sale.shippingAddress &&
    (shippingDestination?.costUnit ?? 0) * (sale?.quantity ?? 0);

  return (
    <tr>
      <td />
      <td>{sale.artist[0].name}</td>
      <td>
        {moneyDisplay({ amount: sale.amount / 100, currency: sale.currency })}
        {sale.shippingAddress && (
          <span>
            <br />
            <small>
              {" "}
              (<strong>{t("shippingCost")}: </strong>
              {shippingDestination?.destinationCountry?.toUpperCase()}{" "}
              {hasShippingCost &&
                moneyDisplay({
                  amount: hasShippingCost / 100,
                  currency: sale.currency,
                })}
              )
            </small>
          </span>
        )}
      </td>
      <td>{formatDate({ date: sale.datePurchased, i18n })} </td>
      <td>
        {sale.trackGroupPurchases?.length
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
        {sale.trackGroupPurchases?.length ? (
          <span>
            {sale.trackGroupPurchases.map((group) => (
              <Link
                key={group.trackGroupId}
                to={getReleaseUrl(sale.artist[0], group.trackGroup)}
              >
                {group.message}
              </Link>
            ))}
          </span>
        ) : sale.merch ? (
          <span>
            <Link to={getMerchUrl(sale.artist[0], sale.merch)}>
              {sale.merch.title}
            </Link>{" "}
            (
            <Link target="_blank" to="/fulfillment">
              Fulfillment <FaExternalLinkAlt />
            </Link>
            )
          </span>
        ) : sale.track ? (
          <span>
            <Link
              to={getTrackUrl(
                sale.artist[0],
                sale.track.trackGroup,
                sale.track
              )}
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
