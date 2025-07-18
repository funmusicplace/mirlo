import { css } from "@emotion/css";
import styled from "@emotion/styled";
import Button from "components/common/Button";
import FormComponent from "components/common/FormComponent";
import { InputEl } from "components/common/Input";
import { SelectEl } from "components/common/Select";
import { formatDate } from "components/TrackGroup/ReleaseDate";
import { useUpdatePurchaseMutation } from "queries";
import React from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { FaExternalLinkAlt } from "react-icons/fa";
import { Link } from "react-router-dom";
import { getArtistUrl, getMerchUrl } from "utils/artist";

export const Underline = styled.div`
  border-bottom: 1px solid var(--mi-darken-x-background-color);
  padding-bottom: 1rem;
  margin-bottom: 1rem;
`;

export const Section = styled.div`
  display: flex;
  margin-bottom: 0.5rem;

  label {
    width: calc(4 / 12 * 100%) !important;
    font-weight: bold;
  }

  a {
    padding-left: 0.5rem;
  }

  input {
    width: auto;
  }
`;

const CustomerPopUp: React.FC<{ purchase: MerchPurchase }> = ({ purchase }) => {
  const { i18n, t } = useTranslation("translation", {
    keyPrefix: "fulfillment",
  });

  const methods = useForm({ defaultValues: purchase });

  const { mutateAsync: updatePurchase } = useUpdatePurchaseMutation();

  const updateStatus = React.useCallback(
    async (data: MerchPurchase) => {
      try {
        await updatePurchase({
          purchaseId: purchase.id,
          purchase: data,
        });
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
          <label>{t("type")}</label>{" "}
          {purchase.options?.map((option) => (
            <ul key={option.id}>
              <li>
                {option.merchOptionType?.optionName}: {option.name}
              </li>
            </ul>
          ))}
        </Section>
        <Section>
          <label>{t("orderDate")}</label>
          {formatDate({
            date: purchase.createdAt,
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
          <label>{t("trackingNumber")}</label>
          <InputEl {...methods.register("trackingNumber")}></InputEl>
        </Section>
        <Section>
          <label>{t("trackingWebsite")}</label>
          <InputEl {...methods.register("trackingWebsite")}></InputEl>
        </Section>
        <Section>
          <label>{t("fulfillmentStatus")}</label>
          <div
            className={css`
              margin-right: 1rem;
            `}
          >
            <p></p>
            <SelectEl {...methods.register("fulfillmentStatus")}>
              <option value="NO_PROGRESS">{t("noProgress")}</option>
              <option value="STARTED">{t("started")}</option>
              <option value="SHIPPED">{t("shipped")}</option>
              <option value="COMPLETED">{t("completed")}</option>
            </SelectEl>
          </div>
        </Section>
      </Underline>
      <Button type="button" onClick={methods.handleSubmit(updateStatus)}>
        Save
      </Button>
    </div>
  );
};

export default CustomerPopUp;
