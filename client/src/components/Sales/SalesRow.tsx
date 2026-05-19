import { Button } from "components/common/Button";
import { Modal } from "components/common/Modal";
import { moneyDisplay } from "components/common/Money";
import { RenderAddress } from "components/FulFillment/CustomerPopUp";
import { formatDate } from "components/TrackGroup/ReleaseDate";
import { Sale } from "queries";
import React from "react";
import { useTranslation } from "react-i18next";
import { FaExternalLinkAlt } from "react-icons/fa";
import { Link } from "react-router-dom";
import { getMerchUrl, getReleaseUrl, getTrackUrl } from "utils/artist";

export const getSaleType = (sale: Sale) =>
  sale.trackGroupPurchases?.length
    ? "trackGroup"
    : sale.merchPurchases?.length
      ? "merch"
      : sale.trackPurchases?.length
        ? "track"
        : sale.artistUserSubscriptionCharges?.length
          ? "subscription"
          : "tip";

export const useShippingDestinations = (sale: Sale) => {
  let shippingDestinations: ShippingDestination[] | undefined;
  sale.merchPurchases?.forEach((purchase) => {
    shippingDestinations = purchase.merch.shippingDestinations?.filter(
      (dest) =>
        dest.destinationCountry?.toLowerCase() ===
        sale.shippingAddress?.country?.toLowerCase()
    );
  });
  return shippingDestinations;
};

export const SaleItem: React.FC<{
  sale: Sale;
  onOpenShippingAddress: () => void;
}> = ({ sale, onOpenShippingAddress }) => {
  const { t } = useTranslation("translation", { keyPrefix: "sales" });

  if (sale.trackGroupPurchases?.length) {
    return (
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
    );
  }
  if (sale.merchPurchases?.length) {
    return (
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
          Fulfillment <FaExternalLinkAlt className="text-xs" />
        </Link>
        )
      </span>
    );
  }
  if (sale.trackPurchases?.length) {
    return (
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
    );
  }
  if (sale.artistUserSubscriptionCharges?.length) {
    const charge = sale.artistUserSubscriptionCharges[0];
    return (
      <span>
        {charge.artistUserSubscription?.artistSubscriptionTier.name} (
        {charge.artistUserSubscription?.artistSubscriptionTier?.interval})
        {charge.artistUserSubscription?.shippingAddress && (
          <Button onClick={onOpenShippingAddress}>Has Shipping</Button>
        )}
      </span>
    );
  }
  return <span>{t("tip")}</span>;
};

const SalesRow: React.FC<{ sale: Sale }> = ({ sale }) => {
  const { i18n, t } = useTranslation("translation", { keyPrefix: "sales" });
  const [openShippingAddress, setOpenShippingAddress] = React.useState(false);

  const shippingDestinations = useShippingDestinations(sale);
  const saleType = getSaleType(sale);

  return (
    <tr>
      <td />
      <td>{sale.userFriendlyId || "---"}</td>
      <td>{sale.artist[0].name}</td>
      <td>{t(saleType)}</td>
      <td>
        {formatDate({
          date: sale.datePurchased,
          i18n,
          options: { dateStyle: "short" },
        })}
      </td>
      <td>
        {moneyDisplay({ amount: sale.amount / 100, currency: sale.currency })}
        {sale.shippingAddress && (
          <span>
            <br />
            <small>
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
        <SaleItem
          sale={sale}
          onOpenShippingAddress={() => setOpenShippingAddress(true)}
        />
        {sale.artistUserSubscriptionCharges?.[0]?.artistUserSubscription
          ?.shippingAddress && (
          <Modal
            open={openShippingAddress}
            title={t("shippingAddress")}
            onClose={() => setOpenShippingAddress(false)}
          >
            <RenderAddress
              shippingAddress={
                sale.artistUserSubscriptionCharges[0].artistUserSubscription
                  .shippingAddress!
              }
            />
          </Modal>
        )}
      </td>
    </tr>
  );
};

export default SalesRow;
