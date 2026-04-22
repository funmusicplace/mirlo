import React from "react";

import { FormProvider, useForm } from "react-hook-form";
import Button from "../common/Button";
import { InputEl } from "../common/Input";
import TextArea from "../common/TextArea";
import FormComponent from "components/common/FormComponent";
import { useSnackbar } from "state/SnackbarContext";
import { pick } from "lodash";
import api from "../../services/api";
import useErrorHandler from "services/useErrorHandler";
import { useTranslation } from "react-i18next";
import { css } from "@emotion/css";
import FormCheckbox from "components/common/FormCheckbox";
import FormError from "components/common/FormError";
import { useAuthContext } from "state/AuthContext";
import { SelectEl } from "components/common/Select";
import PaymentSlider from "./ManageTrackGroup/AlbumFormComponents/PaymentSlider";
import styled from "@emotion/styled";
import UploadGeneralImage from "./UploadGeneralImage";
import ManageSubscriptionTierReleases from "./ManageSubscriptionTierReleases";
import { ArtistButton } from "components/Artist/ArtistButtons";

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

type FormData = {
  name: string;
  description: string;
  minAmount: string;
  digitalDiscountPercent?: number;
  merchDiscountPercent?: number;
  allowVariable: boolean;
  autoPurchaseAlbums: boolean;
  platformPercent?: number;
  collectAddress: boolean;
  interval: "MONTH" | "YEAR";
  imageId?: string;
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

  const methods = useForm<FormData>({
    defaultValues: generateDefaultValues(existing),
  });
  const { register, handleSubmit, reset, formState } = methods;

  const [localExisting, setLocalExisting] = React.useState(existing);
  const localExistingId = localExisting?.id;
  const userId = user?.id;
  const artistId = artist.id;

  const doSave = React.useCallback(
    async (data: FormData) => {
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
              "imageId",
            ]),
            minAmount: data.minAmount ? +data.minAmount * 100 : undefined,
            digitalDiscountPercent:
              data.digitalDiscountPercent !== undefined
                ? Number(data.digitalDiscountPercent)
                : undefined,
            merchDiscountPercent:
              data.merchDiscountPercent !== undefined
                ? Number(data.merchDiscountPercent)
                : undefined,
          };
          if (localExistingId) {
            const result = await api.put<
              Partial<ArtistSubscriptionTier>,
              ArtistSubscriptionTier
            >(
              `manage/artists/${artistId}/subscriptionTiers/${localExistingId}`,
              sending
            );
            reload();
          } else {
            const result = await api.post<
              Partial<ArtistSubscriptionTier>,
              { result: ArtistSubscriptionTier }
            >(`manage/artists/${artistId}/subscriptionTiers/`, sending);
            await api.get<ArtistSubscriptionTier>(
              `manage/artists/${artistId}/subscriptionTiers/${result.result.id}`
            );
            setLocalExisting(result.result);
            reset();
          }

          snackbar(t("subscriptionUpdated"), { type: "success" });
          reload();
        } catch (e) {
          errorHandler(e);
        } finally {
          setIsSaving(false);
        }
      }
    },
    [
      userId,
      localExistingId,
      t,
      snackbar,
      reset,
      reload,
      artistId,
      errorHandler,
    ]
  );

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(doSave)}>
        <UploadGeneralImage
          artistId={artist.id}
          imageTypeDescription={t("tierImageDescription")}
          height="200px"
          image={existing?.images?.[0]?.image}
          width="100%"
          size={625}
          dimensions="banner"
          maxDimensions="700x400"
          maxSize="15mb"
        />
        <FormSection>
          <FormComponent>
            <label htmlFor="input-name">{t("name")}</label>
            <InputEl id="input-name" {...register("name")} />
          </FormComponent>
          <FormComponent>
            <label htmlFor="input-description">{t("description")}</label>
            <TextArea id="input-description" {...register("description")} />
          </FormComponent>
        </FormSection>
        <FormSection>
          <h2>{t("theMoneyBit")}</h2>
          <FormComponent>
            <label htmlFor="input-minimum-amount">{t("minimumAmount")}</label>
            <div className="flex w-full items-center gap-2">
              <InputEl
                aria-describedby="unit-minimum-amount"
                id="input-minimum-amount"
                step={0.01}
                type="number"
                {...register("minAmount", { min: 1 })}
                min={0}
              />
              <span className="whitespace-nowrap" id="unit-minimum-amount">
                {t("inCurrency", { currency: user?.currency ?? "usd" })}
              </span>
            </div>
            {formState.errors.minAmount && (
              <FormError>
                {formState.errors.minAmount.type === "min" &&
                  t("minAmountError")}
              </FormError>
            )}
            <FormCheckbox
              idPrefix={`${localExistingId}`}
              keyName="allowVariable"
              description={t("allowVariableDescription")}
            />
          </FormComponent>

          {localExistingId && (
            <FormComponent className="grow backdrop-brightness-95 p-4">
              <PaymentSlider
                label={t("platformPercent")}
                url={`manage/artists/${artistId}/subscriptionTiers/${localExistingId}`}
                extraData={{ artistId: Number(artistId) }}
              />
              {formState.errors.platformPercent && (
                <FormError>{t("platformPercent")}</FormError>
              )}
            </FormComponent>
          )}

          <FormComponent>
            <label htmlFor="select-interval">{t("interval")}</label>
            <SelectEl
              defaultValue="paid"
              id="select-interval"
              {...register("interval")}
            >
              <option value="MONTH">{t("monthly")}</option>
              <option value="YEAR">{t("yearly")}</option>
            </SelectEl>
          </FormComponent>
        </FormSection>

        <FormSection>
          <h2>{t("rewards")}</h2>
          <FormComponent>
            <label htmlFor="digitalDiscountPercent">
              {t("digitalDiscountPercent")}
            </label>
            <div className="flex w-full items-center">
              <InputEl
                step={1}
                type="number"
                {...register("digitalDiscountPercent", { min: 0, max: 100 })}
                min={0}
                id="digitalDiscountPercent"
                max={100}
              />
              <span className="ml-1">%</span>
            </div>
            {formState.errors.digitalDiscountPercent && (
              <FormError>{t("digitalDiscountPercentError")}</FormError>
            )}
          </FormComponent>
          <FormComponent>
            <label htmlFor="merchDiscountPercent">
              {t("merchDiscountPercent")}
            </label>
            <div className="flex w-full items-center">
              <InputEl
                step={1}
                type="number"
                {...register("merchDiscountPercent", { min: 0, max: 100 })}
                min={0}
                id="merchDiscountPercent"
                max={100}
              />
              <span className="ml-1">%</span>
            </div>
            {formState.errors.merchDiscountPercent && (
              <FormError>{t("merchDiscountPercentError")}</FormError>
            )}
          </FormComponent>
          <FormComponent>
            <FormCheckbox
              idPrefix={`${localExistingId}`}
              keyName="autoPurchaseAlbums"
              description={t("autoAlbumPurchase")}
            />
          </FormComponent>
          <FormComponent>
            <FormCheckbox
              idPrefix={`${localExistingId}`}
              keyName="collectAddress"
              description={t("collectAddress")}
            />
          </FormComponent>
          {existing && (
            <ManageSubscriptionTierReleases
              tier={existing}
              artistId={artist.id}
              reload={reload}
            />
          )}
        </FormSection>
        <FormComponent>
          <ArtistButton type="submit" disabled={isSaving} isLoading={isSaving}>
            {localExistingId ? t("saveSubscription") : t("createSubscription")}
          </ArtistButton>
        </FormComponent>
      </form>
    </FormProvider>
  );
};

export default SubscriptionForm;
