import { css } from "@emotion/css";
import styled from "@emotion/styled";
import Button from "components/common/Button";
import { SelectEl } from "components/common/Select";
import { formatDate } from "components/TrackGroup/ReleaseDate";
import { useUpdatePurchaseMutation } from "queries";
import React from "react";
import { useTranslation } from "react-i18next";
import { FaExternalLinkAlt } from "react-icons/fa";
import { Link } from "react-router-dom";
import { getArtistUrl, getMerchUrl } from "utils/artist";

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

  a {
    padding-left: 0.5rem;
  }
`;

const CustomerPopUp: React.FC<{ purchase: MerchPurchase }> = ({ purchase }) => {
  const { i18n, t } = useTranslation("translation", {
    keyPrefix: "fulfillment",
  });

  const [status, setStatus] = React.useState(purchase.fulfillmentStatus);

  const { mutateAsync: updatePurchase } = useUpdatePurchaseMutation();

  const updateStatus = React.useCallback(
    async (e: React.ChangeEvent<HTMLSelectElement>) => {
      e.preventDefault();
      e.stopPropagation();
      try {
        await updatePurchase({
          purchaseId: purchase.id,
          purchase: { fulfillmentStatus: e.target.value },
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
          <label>{t("itemArtist")}</label>{" "}
          <span>
            {purchase.merch.artist.name}
            <Link to={getArtistUrl(purchase.merch.artist)} target="_blank">
              <FaExternalLinkAlt />
            </Link>
          </span>
        </Section>
        <Section>
          <label>{t("itemPurchased")}</label>{" "}
          <span>
            {purchase.merch.title}
            <Link
              to={getMerchUrl(purchase.merch.artist, purchase.merch)}
              target="_blank"
            >
              <FaExternalLinkAlt />
            </Link>
          </span>
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
            {purchase.shippingAddress && (
              <>
                {purchase.shippingAddress.line1 && (
                  <>
                    {purchase.shippingAddress.line1}
                    <br />
                  </>
                )}
                {purchase.shippingAddress.line1 && (
                  <>
                    {purchase.shippingAddress.line2}
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
              </>
            )}
          </p>
        </Section>
      </Underline>
      <Underline>
        <Section>
          <label>{t("fulfillmentStatus")}</label>
          <div
            className={css`
              margin-right: 1rem;
            `}
          >
            <p></p>
            <SelectEl value={status} onChange={updateStatus}>
              <option value="NO_PROGRESS">{t("noProgress")}</option>
              <option value="STARTED">{t("started")}</option>
              <option value="SHIPPED">{t("shipped")}</option>
              <option value="COMPLETED">{t("completed")}</option>
            </SelectEl>
          </div>
          <Button type="button">Save</Button>
        </Section>
      </Underline>
    </div>
  );
};

export default CustomerPopUp;
