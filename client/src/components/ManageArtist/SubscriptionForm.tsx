import React from "react";

import { useForm } from "react-hook-form";
import Button from "../common/Button";
import { InputEl } from "../common/Input";
import TextArea from "../common/TextArea";
import FormComponent from "components/common/FormComponent";
import { useSnackbar } from "state/SnackbarContext";
import { pick } from "lodash";
import LoadingSpinner from "components/common/LoadingSpinner";
import api from "../../services/api";
import { useGlobalStateContext } from "state/GlobalState";
import Box from "components/common/Box";
import CurrencyInput from "react-currency-input-field";

const SubscriptionForm: React.FC<{
  artist: Artist;
  existing?: ArtistSubscriptionTier;
  reload: () => void;
}> = ({ artist, existing, reload }) => {
  const {
    state: { user },
  } = useGlobalStateContext();
  const snackbar = useSnackbar();
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
              `users/${userId}/artists/${artistId}/subscriptions/${existingId}`,
              sending
            );
          } else {
            await api.post<
              Partial<ArtistSubscriptionTier>,
              ArtistSubscriptionTier
            >(`users/${userId}/artists/${artistId}/subscriptions/`, {
              ...pick(data, ["name", "description"]),
              minAmount: data.minAmount ? +data.minAmount * 100 : undefined,
            });
          }

          snackbar("Subscription updated", { type: "success" });
          reset();
          reload();
        } catch (e) {
          console.error("e", e);
          snackbar("There was a problem with the API", { type: "warning" });
        } finally {
          setIsSaving(false);
        }
      }
    },
    [userId, existingId, snackbar, reset, reload, artistId]
  );

  return (
    <Box>
      <form onSubmit={handleSubmit(doSave)}>
        <h4>
          {existing ? "Edit" : "New"} Subscription Tier for {artist.name}
        </h4>

        <FormComponent>
          name: <InputEl {...register("name")} />
        </FormComponent>
        <FormComponent>
          minimum amount:{" "}
          <InputEl as={CurrencyInput} {...register("minAmount")} />
        </FormComponent>

        <FormComponent>
          description: <TextArea {...register("description")} />
        </FormComponent>
        <Button
          type="submit"
          disabled={isSaving}
          compact
          startIcon={isSaving ? <LoadingSpinner /> : undefined}
        >
          {existing ? "Save" : "Create"} Subscription
        </Button>
      </form>
    </Box>
  );
};

export default SubscriptionForm;
