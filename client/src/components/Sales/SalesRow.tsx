import { formatDate } from "components/TrackGroup/ReleaseDate";
import React from "react";
import { useTranslation } from "react-i18next";
import { moneyDisplay } from "components/common/Money";
import { Link } from "react-router-dom";
import { getMerchUrl, getReleaseUrl, getTrackUrl } from "utils/artist";
import { Sale } from "queries";
import { FaExternalLinkAlt } from "react-icons/fa";
import { css } from "@emotion/css";

const SalesRow: React.FC<{
  sale: Sale;
}> = ({ sale }) => {
  const { i18n, t } = useTranslation("translation", {
    keyPrefix: "sales",
  });

  let shippingDestinations: ShippingDestination[] | undefined;
  sale.merchPurchases?.forEach((purchase) => {
    shippingDestinations = purchase.merch.shippingDestinations?.filter(
      (dest) =>
        dest.destinationCountry?.toLowerCase() ===
        sale.shippingAddress?.country?.toLowerCase()
    );
  });

  const saleType = sale.trackGroupPurchases?.length
    ? "trackGroup"
    : sale.merchPurchases?.length
      ? "merch"
      : sale.trackPurchases?.length
        ? "track"
        : sale.artistSubscriptionTier
          ? "subscription"
          : "tip";

  return (
    <tr>
      <td />
      <td>{sale.artist[0].name}</td>
      <td>{t(saleType)}</td>{" "}
      <td>{formatDate({ date: sale.datePurchased, i18n })} </td>
      <td>
        {moneyDisplay({ amount: sale.amount / 100, currency: sale.currency })}
        {sale.shippingAddress && (
          <span>
            <br />
            <small>
              {" "}
              (<strong>{t("shippingCost")}: </strong>
              {shippingDestinations?.[0]?.destinationCountry?.toUpperCase()}{" "}
              {sale.shippingFeeAmount &&
                moneyDisplay({
                  amount: sale.shippingFeeAmount / 100,
                  currency: sale.currency,
                })}
              )
            </small>
          </span>
        )}
      </td>
      <td>
        {moneyDisplay({
          amount: sale.platformCut / 100,
          currency: sale.currency,
        })}
      </td>
      <td>
        {moneyDisplay({
          amount: sale.paymentProcessorCut / 100,
          currency: sale.currency,
        })}
      </td>
      <td>
        {sale.trackGroupPurchases?.length ? (
          <span>
            {sale.trackGroupPurchases.map((group) => (
              <Link
                key={`tg-${group.trackGroupId}`}
                to={getReleaseUrl(sale.artist[0], group.trackGroup)}
              >
                {group.trackGroup.title}
              </Link>
            ))}
          </span>
        ) : sale.merchPurchases?.length ? (
          <span>
            {sale.merchPurchases.map((merch) => (
              <Link
                key={`m-${merch.merchId}`}
                to={getMerchUrl(sale.artist[0], merch.merch)}
              >
                {merch.merch.title}
              </Link>
            ))}{" "}
            (
            <Link target="_blank" to="/fulfillment">
              Fulfillment{" "}
              <FaExternalLinkAlt
                className={css`
                  font-size: 0.8rem;
                `}
              />
            </Link>
            )
          </span>
        ) : sale.trackPurchases?.length ? (
          <span>
            {sale.trackPurchases.map((track) => (
              <Link
                key={`t-${track.trackId}`}
                to={getTrackUrl(
                  sale.artist[0],
                  track.track.trackGroup,
                  track.track
                )}
              >
                {track.track.title}
              </Link>
            ))}
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
