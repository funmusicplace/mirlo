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
              "autoPurchaseAlbums",
            ]),
            minAmount: data.minAmount ? +data.minAmount * 100 : undefined,
          };
          if (existingId) {
            await api.put<
              Partial<ArtistSubscriptionTier>,
              ArtistSubscriptionTier
            >(
              `users/${userId}/artists/${artistId}/subscriptionTiers/${existingId}`,
              sending,
            );
          } else {
            await api.post<
              Partial<ArtistSubscriptionTier>,
              ArtistSubscriptionTier
            >(
              `users/${userId}/artists/${artistId}/subscriptionTiers/`,
              sending,
            );
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
    [userId, existingId, t, snackbar, reset, reload, artistId, errorHandler],
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
            <div
              className={css`
                display: flex;
                width: 100%;

                span {
                  margin-left: 1rem;
                }
              `}
            >
              <InputEl type="number" {...register("minAmount", { min: 1 })} />
              <span>in {user?.currency ?? "usd"}</span>
            </div>
            {formState.errors.minAmount && (
              <FormError>
                {formState.errors.minAmount.type === "min" &&
                  t("minAmountError")}
              </FormError>
            )}
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
          <FormCheckbox
            idPrefix={`${existingId}`}
            keyName="autoPurchaseAlbums"
            description={t("autoAlbumPurchase")}
          />
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
