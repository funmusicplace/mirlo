import { Button } from "components/common/Button";
import { Modal } from "components/common/Modal";
import { moneyDisplay } from "components/common/Money";
import { RenderAddress } from "components/FulFillment/CustomerPopUp";
import { formatDate } from "components/TrackGroup/ReleaseDate";
import { Sale } from "queries";
import React from "react";
import { useTranslation } from "react-i18next";
import { FaChevronDown, FaChevronUp, FaExternalLinkAlt } from "react-icons/fa";
import { Link } from "react-router-dom";
import { getMerchUrl, getReleaseUrl, getTrackUrl } from "utils/artist";

const getSaleType = (sale: Sale) =>
  sale.trackGroupPurchases?.length
    ? "trackGroup"
    : sale.merchPurchases?.length
      ? "merch"
      : sale.trackPurchases?.length
        ? "track"
        : sale.artistUserSubscriptionCharges?.length
          ? "subscription"
          : "tip";

const useShippingDestinations = (sale: Sale) => {
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

const SaleItem: React.FC<{
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

export const SalesCard: React.FC<{ sale: Sale }> = ({ sale }) => {
  const { i18n, t } = useTranslation("translation", { keyPrefix: "sales" });
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [openShippingAddress, setOpenShippingAddress] = React.useState(false);

  const shippingDestinations = useShippingDestinations(sale);
  const saleType = getSaleType(sale);
  const detailsId = `sale-details-${sale.datePurchased}-${sale.userFriendlyId ?? ""}`;

  return (
    <li className="flex flex-col gap-3 rounded-md border border-(--mi-tint-x-color) bg-(--mi-button-tint-color) p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-0.5 min-w-0">
          <div className="text-lg font-semibold">
            {moneyDisplay({
              amount: sale.amount / 100,
              currency: sale.currency,
            })}
          </div>
          {sale.shippingAddress && sale.shippingFeeAmount && (
            <div className="text-xs text-(--mi-secondary-text-color)">
              {t("shippingCost")}:{" "}
              {shippingDestinations?.[0]?.destinationCountry?.toUpperCase()}{" "}
              {moneyDisplay({
                amount: sale.shippingFeeAmount / 100,
                currency: sale.currency,
              })}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="rounded-full bg-(--mi-darken-background-color) px-2 py-0.5 text-xs">
            {t(saleType)}
          </span>
          <Button
            type="button"
            variant="transparent"
            size="compact"
            onlyIcon
            startIcon={isExpanded ? <FaChevronUp /> : <FaChevronDown />}
            aria-expanded={isExpanded}
            aria-controls={detailsId}
            aria-label={isExpanded ? t("collapseDetails") : t("expandDetails")}
            onClick={() => setIsExpanded((v) => !v)}
          />
        </div>
      </div>

      <dl className="flex flex-col gap-2 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-(--mi-secondary-text-color)">{t("artist")}</dt>
          <dd className="text-right">{sale.artist[0].name}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-(--mi-secondary-text-color)">{t("date")}</dt>
          <dd className="text-right">
            {formatDate({
              date: sale.datePurchased,
              i18n,
              options: { dateStyle: "short" },
            })}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-(--mi-secondary-text-color)">{t("item")}</dt>
          <dd className="text-right min-w-0">
            <SaleItem
              sale={sale}
              onOpenShippingAddress={() => setOpenShippingAddress(true)}
            />
          </dd>
        </div>
      </dl>

      {isExpanded && (
        <dl
          id={detailsId}
          className="flex flex-col gap-2 border-t border-(--mi-tint-x-color) pt-3 text-sm"
        >
          <div className="flex justify-between gap-3">
            <dt className="text-(--mi-secondary-text-color)">
              {t("transactionId")}
            </dt>
            <dd className="text-right">{sale.userFriendlyId || "---"}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-(--mi-secondary-text-color)">
              {t("platformCut")}
            </dt>
            <dd className="text-right">
              {moneyDisplay({
                amount: sale.platformCut / 100,
                currency: sale.currency,
              })}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-(--mi-secondary-text-color)">
              {t("paymentProcessorCut")}
            </dt>
            <dd className="text-right">
              {moneyDisplay({
                amount: sale.paymentProcessorCut / 100,
                currency: sale.currency,
              })}
            </dd>
          </div>
        </dl>
      )}

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
    </li>
  );
};

export default SalesRow;
