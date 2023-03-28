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
  const { register, handleSubmit } = useForm<{
    name: string;
    description: string;
  }>({
    defaultValues: existing ?? {
      name: "",
      description: "",
    },
  });

  const existingId = existing?.id;
  const userId = user?.id;
  const artistId = artist.id;

  const doSave = React.useCallback(
    async (data: { name: string; description: string }) => {
      if (userId) {
        try {
          setIsSaving(true);
          if (existingId) {
            const sending = pick(data, ["name", "description"]);
            await api.put<
              Partial<ArtistSubscriptionTier>,
              ArtistSubscriptionTier
            >(
              `users/${userId}/artists/${artistId}/subscriptions/${existingId}`,
              {
                ...sending,
              }
            );
          } else {
            await api.post<
              Partial<ArtistSubscriptionTier>,
              ArtistSubscriptionTier
            >(`users/${userId}/artists/${artistId}/subscriptions/`, {
              ...pick(data, ["name", "description"]),
            });
          }

          snackbar("Subscription updated", { type: "success" });
          reload();
        } catch (e) {
          console.error("e", e);
          snackbar("There was a problem with the API", { type: "warning" });
        } finally {
          setIsSaving(false);
        }
      }
    },
    [userId, existingId, snackbar, reload, artistId]
  );

  return (
    <Box>
      <form onSubmit={handleSubmit(doSave)}>
        <h4>
          {existing ? "Edit" : "New"} Subscription for {artist.name}
        </h4>

        <FormComponent>
          name: <InputEl {...register("name")} />
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
