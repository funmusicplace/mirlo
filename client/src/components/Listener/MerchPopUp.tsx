import { css } from "@emotion/css";
import Button from "components/common/Button";
import FormComponent from "components/common/FormComponent";
import TextArea from "components/common/TextArea";
import { Section, Underline } from "components/FulFillment/CustomerPopUp";
import { formatDate } from "components/TrackGroup/ReleaseDate";
import React from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { FaExternalLinkAlt } from "react-icons/fa";
import { Link } from "react-router-dom";
import api from "services/api";
import { useSnackbar } from "state/SnackbarContext";
import { getArtistUrl, getMerchUrl } from "utils/artist";

const MerchPopUp: React.FC<{ purchase: MerchPurchase }> = ({ purchase }) => {
  const { i18n, t } = useTranslation("translation", {
    keyPrefix: "fulfillment",
  });
  const snackbar = useSnackbar();

  const methods = useForm({ defaultValues: { message: "" } });

  const sendContactMessage = React.useCallback(
    async (data: { message: string }) => {
      try {
        await api.post(`manage/purchases/${purchase.id}/contactArtist`, {
          ...data,
        });
        methods.reset();
        snackbar(t("messageSent", { type: "success" }));
      } catch (e) {
        snackbar(t("messageFailed", { type: "error" }));
      }
    },
    [purchase.id]
  );

  return (
    <div>
      <Underline>
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
          <span>{purchase.trackingNumber}</span>
        </Section>
        <Section>
          <label>{t("trackingWebsite")}</label>
          <span>{purchase.trackingWebsite}</span>
        </Section>
        <Section>
          <label>{t("fulfillmentStatus")}</label>

          <span>{t(purchase.fulfillmentStatus.toLowerCase())}</span>
        </Section>
      </Underline>

      <form onSubmit={methods.handleSubmit(sendContactMessage)}>
        <FormComponent>
          <label htmlFor="message">{t("contactArtistMessage")}</label>
          <TextArea id="message" {...methods.register("message")} required />
          <Button
            className={css`
              margin-top: 1rem;
            `}
            type="submit"
          >
            {t("contactArtist")}
          </Button>
        </FormComponent>
      </form>
    </div>
  );
};

export default MerchPopUp;
