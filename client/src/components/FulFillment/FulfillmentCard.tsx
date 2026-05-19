import Button from "components/common/Button";
import Modal from "components/common/Modal";
import { formatDate } from "components/TrackGroup/ReleaseDate";
import React from "react";
import { useTranslation } from "react-i18next";
import { FaChevronDown, FaChevronUp, FaEye } from "react-icons/fa";

import CustomerPopUp from "./CustomerPopUp";
import { statusMap } from "./FulfillmentRow";

export const FulfillmentCard: React.FC<{ purchase: MerchPurchase }> = ({
  purchase,
}) => {
  const { i18n, t } = useTranslation("translation", {
    keyPrefix: "fulfillment",
  });
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const detailsId = React.useId();

  return (
    <li className="flex flex-col gap-3 rounded-md border border-(--mi-tint-x-color) bg-(--mi-button-tint-color) p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-0.5 min-w-0">
          <div className="text-lg font-semibold truncate">
            {purchase.user.name}
          </div>
          <div className="text-xs text-(--mi-secondary-text-color) truncate">
            {purchase.merch.artist.name}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span
            className={`rounded-full px-2 py-0.5 text-xs ${
              purchase.fulfillmentStatus === "COMPLETED"
                ? "bg-(--mi-green-100) text-(--mi-green-700)"
                : "bg-(--mi-darken-background-color)"
            }`}
          >
            {t(statusMap[purchase.fulfillmentStatus])}
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
          <dt className="text-(--mi-secondary-text-color)">{t("merchItem")}</dt>
          <dd className="text-right min-w-0 truncate">
            {purchase.merch.title}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-(--mi-secondary-text-color)">{t("quantity")}</dt>
          <dd className="text-right">{purchase.quantity}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-(--mi-secondary-text-color)">{t("orderDate")}</dt>
          <dd className="text-right">
            {formatDate({
              date: purchase.createdAt,
              i18n,
              options: { dateStyle: "short" },
            })}
          </dd>
        </div>
      </dl>

      {isExpanded && (
        <dl
          id={detailsId}
          className="flex flex-col gap-2 border-t border-(--mi-tint-x-color) pt-3 text-sm"
        >
          <div className="flex justify-between gap-3">
            <dt className="text-(--mi-secondary-text-color)">{t("email")}</dt>
            <dd className="text-right min-w-0 truncate">
              {purchase.user.email}
            </dd>
          </div>
          {purchase.options && purchase.options.length > 0 && (
            <div className="flex justify-between gap-3">
              <dt className="text-(--mi-secondary-text-color)">
                {t("itemPurchased")}
              </dt>
              <dd className="text-right min-w-0">
                {purchase.options.map((option) => (
                  <span key={option.id} className="block">
                    {option.merchOptionType?.optionName}: {option.name}
                  </span>
                ))}
              </dd>
            </div>
          )}
          <div className="flex justify-between gap-3">
            <dt className="text-(--mi-secondary-text-color)">
              {t("lastUpdated")}
            </dt>
            <dd className="text-right">
              {formatDate({
                date: purchase.updatedAt,
                i18n,
                options: { dateStyle: "short" },
              })}
            </dd>
          </div>
          <Button
            type="button"
            onClick={() => setIsEditing(true)}
            startIcon={<FaEye />}
            size="compact"
            className="self-start mt-2"
          >
            {t("purchaseDetails")}
          </Button>
        </dl>
      )}

      <Modal
        open={isEditing}
        onClose={() => setIsEditing(false)}
        title={t("purchaseDetails")}
      >
        <CustomerPopUp purchase={purchase} />
      </Modal>
    </li>
  );
};

export default FulfillmentCard;
