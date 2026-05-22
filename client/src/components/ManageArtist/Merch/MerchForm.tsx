import { css } from "@emotion/css";
import { useQueryClient } from "@tanstack/react-query";
import { ArtistButton } from "components/Artist/ArtistButtons";
import DraftRestoredBanner from "components/common/DraftRestoredBanner";
import FormComponent from "components/common/FormComponent";
import FormError from "components/common/FormError";
import { InputEl } from "components/common/Input";
import TextArea from "components/common/TextArea";
import { QUERY_KEY_MERCH } from "queries/queryKeys";
import React from "react";
import { FormProvider, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import api from "services/api";
import useErrorHandler from "services/useErrorHandler";
import { useAuthContext } from "state/AuthContext";
import { useSnackbar } from "state/SnackbarContext";
import { useFormPersist } from "utils/useFormPersist";

import PaymentSlider from "../ManageTrackGroup/AlbumFormComponents/PaymentSlider";

import DownloadableContent from "./DownloadableContent";
import SelectTrackGroup from "./SelectTrackGroup";

interface MerchFormData {
  title: string;
  description: string;
  minPrice: string;
  quantityRemaining: number;
  catalogNumber: string;
  platformPercent: number;
  externalUrl?: string | null;
}

const toCentsOrNull = (value: unknown) => {
  if (value === "" || value === null || value === undefined) return null;
  const num = Number(value);
  if (isNaN(num)) return null;
  return Math.round(num * 100);
};

const buildDefaultValues = (merch: Merch): MerchFormData =>
  ({
    ...merch,
    minPrice: `${merch?.minPrice !== undefined ? merch.minPrice / 100 : ""}`,
  }) as unknown as MerchFormData;

const MerchForm: React.FC<{
  merch: Merch;
  artist: Artist;
  reload: () => void;
}> = ({ merch, reload }) => {
  const { t } = useTranslation("translation", { keyPrefix: "manageMerch" });
  const snackbar = useSnackbar();
  const errorHandler = useErrorHandler();
  const [isSaving, setIsSaving] = React.useState(false);

  const client = useQueryClient();

  const methods = useForm<MerchFormData>();
  const {
    handleSubmit,
    register,
    reset,
    formState: { errors, isDirty },
  } = methods;
  const { user } = useAuthContext();
  const userId = user?.id;

  React.useEffect(() => {
    methods.reset(buildDefaultValues(merch), {
      keepDirtyValues: true,
      keepDirty: true,
    });
  }, [merch]);

  const draftKey = merch?.id ? `merchDraft-${merch.id}` : null;
  const { hasRestoredDraft, clearDraft, discardDraft, dismissBanner } =
    useFormPersist(draftKey, methods);

  const doSave = React.useCallback(
    async (values: MerchFormData) => {
      if (!userId) return;
      try {
        setIsSaving(true);
        await api.put(`manage/merch/${merch.id}`, {
          title: values.title,
          description: values.description,
          minPrice: toCentsOrNull(values.minPrice) ?? 0,
          quantityRemaining: Number(values.quantityRemaining),
          catalogNumber: values.catalogNumber,
          externalUrl: values.externalUrl ?? null,
          platformPercent: values.platformPercent,
        });
        reset(values);
        clearDraft();
        client.invalidateQueries({
          predicate: (query) =>
            query.queryKey.some(
              (obj) =>
                typeof obj === "string" &&
                obj.toLowerCase().includes(QUERY_KEY_MERCH.toLowerCase())
            ),
        });
        snackbar(t("merchUpdated"), { type: "success" });
        await reload();
      } catch (e) {
        errorHandler(e);
      } finally {
        setIsSaving(false);
      }
    },
    [
      client,
      clearDraft,
      errorHandler,
      merch.id,
      reload,
      reset,
      snackbar,
      t,
      userId,
    ]
  );

  const isDisabled = isSaving || !isDirty;

  return (
    <FormProvider {...methods}>
      <form
        onSubmit={handleSubmit(doSave)}
        className={css`
          width: 100%;
        `}
      >
        {hasRestoredDraft && (
          <DraftRestoredBanner
            onDiscard={() => discardDraft(buildDefaultValues(merch))}
            onKeep={dismissBanner}
          />
        )}
        <FormComponent>
          <label htmlFor="input-merch-title">{t("merchTitle")}</label>
          <InputEl id="input-merch-title" {...register("title")} />
        </FormComponent>
        <FormComponent>
          <label htmlFor="input-merch-description">
            {t("merchDescription")}
          </label>
          <TextArea
            id="input-merch-description"
            rows={3}
            {...register("description")}
          />
        </FormComponent>
        <FormComponent>
          <label htmlFor="input-price">{t("price")}</label>
          <InputEl
            id="input-price"
            type="number"
            step="0.01"
            min={0}
            {...register("minPrice", { min: 0 })}
          />
          {errors.minPrice && <FormError>{t("priceZeroOrMore")}</FormError>}
        </FormComponent>

        <FormComponent>
          <label htmlFor="input-quantity">{t("quantity")}</label>
          <InputEl
            aria-describedby="hint-quantity"
            id="input-quantity"
            type="number"
            step="1"
            min={0}
            {...register("quantityRemaining", { min: 0 })}
          />
          <small id="hint-quantity">{t("quantityRemainingDescription")}</small>
        </FormComponent>
        <FormComponent>
          <label htmlFor="input-catalog-number">{t("catalogNumber")}</label>
          <InputEl id="input-catalog-number" {...register("catalogNumber")} />
          {errors.catalogNumber && (
            <FormError>{t("catalogNumberInvalid")}</FormError>
          )}
        </FormComponent>
        <FormComponent>
          <label htmlFor="input-external-url">{t("externalUrlLabel")}</label>
          <InputEl
            id="input-external-url"
            type="url"
            placeholder="https://"
            aria-describedby="hint-external-url"
            {...register("externalUrl")}
          />
          <small id="hint-external-url">{t("externalUrlDescription")}</small>
        </FormComponent>
        <FormComponent>
          <PaymentSlider label={t("platformPercent")} />
        </FormComponent>
        <SelectTrackGroup merch={merch} reload={reload} />
        <DownloadableContent item={merch} reload={reload} itemType="merch" />
        <ArtistButton
          wrap
          size="big"
          rounded
          type="submit"
          disabled={isDisabled}
          isLoading={isSaving}
        >
          {t("saveMerch")}
        </ArtistButton>
      </form>
    </FormProvider>
  );
};

export default MerchForm;
