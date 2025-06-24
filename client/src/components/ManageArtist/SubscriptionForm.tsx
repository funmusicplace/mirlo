import React from "react";

import { FormProvider, useForm } from "react-hook-form";
import Button from "../common/Button";
import { InputEl } from "../common/Input";
import TextArea from "../common/TextArea";
import FormComponent from "components/common/FormComponent";
import { useSnackbar } from "state/SnackbarContext";
import { pick } from "lodash";
import api from "../../services/api";
import Box from "components/common/Box";
import useErrorHandler from "services/useErrorHandler";
import { useTranslation } from "react-i18next";
import { css } from "@emotion/css";
import FormCheckbox from "components/common/FormCheckbox";
import FormError from "components/common/FormError";
import { useAuthContext } from "state/AuthContext";
import { SelectEl } from "components/common/Select";
import PaymentSlider from "./ManageTrackGroup/AlbumFormComponents/PaymentSlider";
import styled from "@emotion/styled";
import FeatureFlag from "components/common/FeatureFlag";

export const FormSection = styled.div`
  margin: 2rem 0;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--mi-darken-x-background-color);

  h2 {
    font-size: 1.3rem;
  }
`;

const generateDefaultValues = (existing?: ArtistSubscriptionTier) => {
  const vals = {
    ...existing,
    minAmount: `${
      existing?.minAmount !== undefined ? existing.minAmount / 100 : ""
    }`,
  };
  return vals;
};
const SubscriptionForm: React.FC<{
  artist: Artist;
  existing?: ArtistSubscriptionTier;
  reload: () => void;
}> = ({ artist, existing, reload }) => {
  const { t } = useTranslation("translation", {
    keyPrefix: "subscriptionForm",
  });

  const { user } = useAuthContext();
  const snackbar = useSnackbar();
  const errorHandler = useErrorHandler();
  const [isSaving, setIsSaving] = React.useState(false);

  const methods = useForm<{
    name: string;
    description: string;
    minAmount: string;
    allowVariable: boolean;
    autoPurchaseAlbums: boolean;
    platformPercent?: number;
    collectAddress: boolean;
    interval: "MONTH" | "YEAR";
  }>({
    defaultValues: generateDefaultValues(existing),
  });
  const { register, handleSubmit, reset, formState } = methods;

  const existingId = existing?.id;
  const userId = user?.id;
  const artistId = artist.id;

  const doSave = React.useCallback(
    async (data: { name: string; description: string; minAmount: string }) => {
      if (userId) {
        try {
          setIsSaving(true);
          const sending = {
            ...pick(data, [
              "name",
              "description",
              "allowVariable",
              "interval",
              "autoPurchaseAlbums",
              "collectAddress",
              "platformPercent",
            ]),
            minAmount: data.minAmount ? +data.minAmount * 100 : undefined,
          };
          if (existingId) {
            await api.put<
              Partial<ArtistSubscriptionTier>,
              ArtistSubscriptionTier
            >(
              `manage/artists/${artistId}/subscriptionTiers/${existingId}`,
              sending
            );
          } else {
            await api.post<
              Partial<ArtistSubscriptionTier>,
              ArtistSubscriptionTier
            >(`manage/artists/${artistId}/subscriptionTiers/`, sending);
          }

          snackbar(t("subscriptionUpdated"), { type: "success" });
          reset();
          reload();
        } catch (e) {
          errorHandler(e);
        } finally {
          setIsSaving(false);
        }
      }
    },
    [userId, existingId, t, snackbar, reset, reload, artistId, errorHandler]
  );

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(doSave)}>
        <FormSection>
          <FormComponent>
            {t("name")}
            <InputEl {...register("name")} />
          </FormComponent>
          <FormComponent>
            <label>{t("description")}</label>
            <TextArea {...register("description")} />
          </FormComponent>
        </FormSection>
        <FormSection>
          <h2>{t("theMoneyBit")}</h2>
          <FormComponent>
            {t("minimumAmount")}
            <div
              className={css`
                display: flex;
                width: 100%;

                span {
                  margin-left: 1rem;
                }
              `}
            >
              <InputEl
                step={0.01}
                type="number"
                {...register("minAmount", { min: 1 })}
                min={0}
              />
              <span>
                {t("inCurrency", { currency: user?.currency ?? "usd" })}
              </span>
            </div>
            {formState.errors.minAmount && (
              <FormError>
                {formState.errors.minAmount.type === "min" &&
                  t("minAmountError")}
              </FormError>
            )}
          </FormComponent>

          {existingId && (
            <FormComponent
              className={css`
                flex-grow: 1;
              `}
            >
              <label>{t("platformPercent")}</label>
              <PaymentSlider
                url={`manage/artists/${artistId}/subscriptionTiers/${existingId}`}
                extraData={{ artistId: Number(artistId) }}
              />
              {formState.errors.platformPercent && (
                <FormError>{t("platformPercent")}</FormError>
              )}
            </FormComponent>
          )}

          <FormComponent>
            <FormCheckbox
              idPrefix={`${existingId}`}
              keyName="allowVariable"
              description={t("allowVariableDescription")}
            />
          </FormComponent>
          <FormComponent>
            <label>{t("interval")}</label>
            <SelectEl defaultValue="paid" {...register("interval")}>
              <option value="MONTH">{t("monthly")}</option>
              <option value="YEAR">{t("yearly")}</option>
            </SelectEl>
          </FormComponent>
        </FormSection>
        <FormSection>
          <h2>{t("rewards")}</h2>
          <FormComponent>
            <FormCheckbox
              idPrefix={`${existingId}`}
              keyName="autoPurchaseAlbums"
              description={t("autoAlbumPurchase")}
            />
          </FormComponent>
          <FeatureFlag featureFlag="subscriptionFulfillment">
            <FormComponent>
              <FormCheckbox
                idPrefix={`${existingId}`}
                keyName="collectAddress"
                description={t("collectAddress")}
              />
            </FormComponent>
          </FeatureFlag>
        </FormSection>
        <FormComponent>
          <Button
            type="submit"
            disabled={isSaving}
            size="compact"
            isLoading={isSaving}
          >
            {existing ? t("saveSubscription") : t("createSubscription")}
          </Button>
        </FormComponent>
      </form>
    </FormProvider>
  );
};

export default SubscriptionForm;
