import React from "react";

import { FormProvider, useForm } from "react-hook-form";
import Button from "../common/Button";
import { InputEl } from "../common/Input";
import TextArea from "../common/TextArea";
import FormComponent from "components/common/FormComponent";
import { useSnackbar } from "state/SnackbarContext";
import { pick } from "lodash";
import api from "../../services/api";
import { useGlobalStateContext } from "state/GlobalState";
import Box from "components/common/Box";
import useErrorHandler from "services/useErrorHandler";
import { useTranslation } from "react-i18next";
import { css } from "@emotion/css";
import FormCheckbox from "components/common/FormCheckbox";

const generateDefaultValues = (existing?: ArtistSubscriptionTier) => {
  const vals = {
    ...existing,
    minAmount: `${
      existing?.minAmount !== undefined ? existing.minAmount / 100 : ""
    }`,
  };
  console.log("vals", vals);
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

  const {
    state: { user },
  } = useGlobalStateContext();
  const snackbar = useSnackbar();
  const errorHandler = useErrorHandler();
  const [isSaving, setIsSaving] = React.useState(false);
  console.log(
    "existing",
    existing,
    existing?.minAmount,
    existing?.minAmount ? existing.minAmount / 100 : ""
  );
  const methods = useForm<{
    name: string;
    description: string;
    minAmount: string;
    allowVariable: boolean;
  }>({
    defaultValues: generateDefaultValues(existing),
  });
  const { register, handleSubmit, reset } = methods;

  const existingId = existing?.id;
  const userId = user?.id;
  const artistId = artist.id;

  const doSave = React.useCallback(
    async (data: { name: string; description: string; minAmount: string }) => {
      if (userId) {
        try {
          setIsSaving(true);
          const sending = {
            ...pick(data, ["name", "description", "allowVariable"]),
            minAmount: data.minAmount ? +data.minAmount * 100 : undefined,
          };
          if (existingId) {
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
            >(
              `users/${userId}/artists/${artistId}/subscriptionTiers/`,
              sending
            );
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
    <FormProvider {...methods}>
      <Box
        className={css`
          background-color: var(--mi-darken-background-color);
        `}
      >
        <form onSubmit={handleSubmit(doSave)}>
          <FormComponent>
            {t("name")}
            <InputEl {...register("name")} />
          </FormComponent>
          <FormComponent>
            {t("minimumAmount")}
            <InputEl type="number" {...register("minAmount")} />
            <small>in {user?.currency}</small>
          </FormComponent>
          <FormCheckbox
            idPrefix={`${existingId}`}
            keyName="allowVariable"
            description={t("allowVariableDescription")}
          />
          <FormComponent>
            {t("description")}
            <TextArea {...register("description")} />
          </FormComponent>
          <Button
            type="submit"
            disabled={isSaving}
            compact
            isLoading={isSaving}
          >
            {existing ? t("saveSubscription") : t("createSubscription")}
          </Button>
        </form>
      </Box>
    </FormProvider>
  );
};

export default SubscriptionForm;
