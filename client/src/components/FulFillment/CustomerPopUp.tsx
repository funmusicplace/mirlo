import { css } from "@emotion/css";
import styled from "@emotion/styled";
import Button from "components/common/Button";
import Modal from "components/common/Modal";
import { SelectEl } from "components/common/Select";
import { formatDate } from "components/TrackGroup/ReleaseDate";
import React from "react";
import { useTranslation } from "react-i18next";
import api from "services/api";

const Underline = styled.div`
  border-bottom: 1px solid var(--mi-darken-x-background-color);
  padding-bottom: 1rem;
  margin-bottom: 1rem;
`;

const Section = styled.div`
  display: flex;
  margin-bottom: 0.5rem;

  label {
    width: calc(3 / 12 * 100%) !important;
    font-weight: bold;
  }
`;

const CustomerPopUp: React.FC<{ purchase: MerchPurchase }> = ({ purchase }) => {
  const { i18n, t } = useTranslation("translation", {
    keyPrefix: "fulfillment",
  });

  const [status, setStatus] = React.useState(purchase.fulfillmentStatus);

  const updateStatus = React.useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      e.preventDefault();
      e.stopPropagation();
      try {
        api.put(`manage/purchases/${purchase.id}`, {
          fulfillmentStatus: e.target.value,
        });
        setStatus(e.target.value as MerchPurchase["fulfillmentStatus"]);
      } catch (e) {}
    },
    [purchase.id]
  );
  return (
    <div>
      <Underline>
        <h2>{purchase.user.name}</h2>
        <Section>
          <label>{t("itemPurchased")}</label>{" "}
          <span>{purchase.merch.title}</span>
        </Section>
        <Section>
          <label>{t("quantity")}</label> <span>{purchase.quantity}</span>
        </Section>
        <Section>
          <label>{t("orderDate")}</label>
          {formatDate({
            date: purchase.updatedAt,
            i18n,
            options: { dateStyle: "short" },
          })}
        </Section>
      </Underline>
      <Underline>
        <Section>
          <label>{t("shippingAddress")}</label>
          <p>
            {purchase.user.name} <br />
            {purchase.shippingAddress.line1 && (
              <>
                {purchase.shippingAddress.line1}
                <br />
              </>
            )}
            {purchase.shippingAddress.line1 && (
              <>
                {purchase.shippingAddress.line1}
                <br />
              </>
            )}
            {purchase.shippingAddress.city && (
              <>
                {purchase.shippingAddress.city}
                <br />
              </>
            )}
            {purchase.shippingAddress.state},
            {purchase.shippingAddress.postal_code}
          </p>
        </Section>
      </Underline>
      <Underline>
        <Section>
          <label>{t("fulfillmentStatus")}</label>
          <div>
            <p></p>
            <SelectEl value={status} onChange={updateStatus}>
              <option value="NO_PROGRESS">{t("noProgress")}</option>
              <option value="STARTED">{t("started")}</option>
              <option value="SHIPPED">{t("shipped")}</option>
              <option value="COMPLETED">{t("completed")}</option>
            </SelectEl>
          </div>
        </Section>
      </Underline>
    </div>
  );
};

export default CustomerPopUp;
