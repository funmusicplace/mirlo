import React from "react";

import { useForm } from "react-hook-form";
import Button from "../common/Button";
import { InputEl } from "../common/Input";
import TextArea from "../common/TextArea";
import FormComponent from "components/common/FormComponent";
import { useSnackbar } from "state/SnackbarContext";
import { pick } from "lodash";
import api from "../../services/api";
import { useGlobalStateContext } from "state/GlobalState";
import Box from "components/common/Box";
import CurrencyInput from "react-currency-input-field";
import useErrorHandler from "services/useErrorHandler";
import { useTranslation } from "react-i18next";
import { css } from "@emotion/css";

const SubscriptionForm: React.FC<{
  artist: Artist;
  existing?: ArtistSubscriptionTier;
  reload: () => void;
}> = ({ artist, existing, reload }) => {
  const { t } = useTranslation("translation", {
    keyPrefix: "subscriptionForm",
  });

  const {
    state: { user },
  } = useGlobalStateContext();
  const snackbar = useSnackbar();
  const errorHandler = useErrorHandler();
  const [isSaving, setIsSaving] = React.useState(false);
  const { register, handleSubmit, reset } = useForm<{
    name: string;
    description: string;
    minAmount: string;
  }>({
    defaultValues: {
      ...existing,
      minAmount: `${existing?.minAmount ? existing.minAmount / 100 : ""}`,
    },
  });

  const existingId = existing?.id;
  const userId = user?.id;
  const artistId = artist.id;

  const doSave = React.useCallback(
    async (data: { name: string; description: string; minAmount: string }) => {
      if (userId) {
        try {
          setIsSaving(true);
          if (existingId) {
            const sending = {
              ...pick(data, ["name", "description", "minAmount"]),
              minAmount: data.minAmount ? +data.minAmount * 100 : undefined,
            };
            await api.put<
              Partial<ArtistSubscriptionTier>,
              ArtistSubscriptionTier
            >(
              `users/${userId}/artists/${artistId}/subscriptionTiers/${existingId}`,
              sending
            );
          } else {
            await api.post<
              Partial<ArtistSubscriptionTier>,
              ArtistSubscriptionTier
            >(`users/${userId}/artists/${artistId}/subscriptionTiers/`, {
              ...pick(data, ["name", "description"]),
              minAmount: data.minAmount ? +data.minAmount * 100 : undefined,
            });
          }

          snackbar("subscriptionUpdated", { type: "success" });
          reset();
          reload();
        } catch (e) {
          errorHandler(e);
        } finally {
          setIsSaving(false);
        }
      }
    },
    [userId, existingId, snackbar, reset, reload, artistId, errorHandler]
  );

  return (
    <Box
      className={css`
        background-color: var(--mi-darken-background-color);
      `}
    >
      <form onSubmit={handleSubmit(doSave)}>
        <h4>{t("editSubscriptionTierFor", { artistName: artist.name })}</h4>

        <FormComponent>
          {t("name")}
          <InputEl {...register("name")} />
        </FormComponent>
        <FormComponent>
          {t("minimumAmount")}
          <InputEl as={CurrencyInput} {...register("minAmount")} />
        </FormComponent>

        <FormComponent>
          {t("description")}
          <TextArea {...register("description")} />
        </FormComponent>
        <Button type="submit" disabled={isSaving} compact isLoading={isSaving}>
          {existing ? t("saveSubscription") : t("createSubscription")}
        </Button>
      </form>
    </Box>
  );
};

export default SubscriptionForm;
