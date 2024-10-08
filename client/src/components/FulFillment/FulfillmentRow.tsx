import Button from "components/common/Button";
import Modal from "components/common/Modal";
import { formatDate } from "components/TrackGroup/ReleaseDate";
import React from "react";
import { useTranslation } from "react-i18next";
import { FaEye } from "react-icons/fa";

import CustomerPopUp from "./CustomerPopUp";
import { css } from "@emotion/css";

const statusMap = {
  SHIPPED: "shipped",
  NO_PROGRESS: "noProgress",
  STARTED: "started",
  COMPLETED: "completed",
};

const FulfillmentRow: React.FC<{ purchase: MerchPurchase; index: number }> = ({
  purchase,
  index,
}) => {
  const { i18n, t } = useTranslation("translation", {
    keyPrefix: "fulfillment",
  });
  const [isEditing, setIsEditing] = React.useState(false);

  return (
    <>
      <tr
        key={purchase.id}
        onClick={() => setIsEditing(true)}
        className={css`
          cursor: pointer;
        `}
      >
        <td>
          <Button onClick={() => setIsEditing(true)} startIcon={<FaEye />} />
        </td>
        <td>{purchase.merch.artist.name}</td>
        <td>{purchase.merch.title} </td>
        <td>{purchase.user.name}</td>
        <td>{purchase.user.email}</td>
        <td>{purchase.quantity}</td>
        <td>
          <Button>{t(statusMap[purchase.fulfillmentStatus])}</Button>
        </td>
        <td>
          {formatDate({
            date: purchase.createdAt,
            i18n,
            options: { dateStyle: "short" },
          })}
        </td>
        <td>
          {formatDate({
            date: purchase.updatedAt,
            i18n,
            options: { dateStyle: "short" },
          })}
        </td>
      </tr>
      <Modal
        open={isEditing}
        onClose={() => setIsEditing(false)}
        title={t("purchaseDetails")}
      >
        <CustomerPopUp purchase={purchase} />
      </Modal>
    </>
  );
};

export default FulfillmentRow;
