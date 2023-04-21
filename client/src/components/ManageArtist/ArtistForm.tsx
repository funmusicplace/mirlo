import React from "react";
import Modal from "components/common/Modal";
import Button from "../common/Button";
import { useForm } from "react-hook-form";
import api from "services/api";
import { InputEl } from "../common/Input";
import LoadingSpinner from "components/common/LoadingSpinner";
import FormComponent from "components/common/FormComponent";
import TextArea from "components/common/TextArea";
import { css } from "@emotion/css";
import { useSnackbar } from "state/SnackbarContext";
import { pick } from "lodash";
import { useGlobalStateContext } from "state/GlobalState";
import UploadArtistImage from "./UploadArtistImage";
// import UploadArtistImage from "./UploadArtistImage";

export interface ShareableTrackgroup {
  creatorId: number;
  slug: string;
}

export const ArtistForm: React.FC<{
  existing?: Artist;
  open: boolean;
  onClose: () => void;
  reload: () => Promise<void>;
}> = ({ open, onClose, reload, existing }) => {
  const snackbar = useSnackbar();
  const { state } = useGlobalStateContext();
  const [isSaving, setIsSaving] = React.useState(false);
  const { register, handleSubmit } = useForm<{ name: string; bio: string }>({
    defaultValues: existing,
  });

  const existingId = existing?.id;

  const soSave = React.useCallback(
    async (data: Partial<Artist>) => {
      if (state.user?.id) {
        try {
          setIsSaving(true);
          if (existingId) {
            await api.put(`artist${existingId}`, {
              ...pick(data, ["bio", "name"]),
            });
          } else {
            await api.post(`users/${state.user.id}/artists`, {
              ...pick(data, ["bio", "name"]),
            });
          }

          await reload();
          if (!existingId) {
            onClose();
          }
          snackbar("Updated artist", { type: "success" });
        } catch (e) {
          console.error(e);
          snackbar("Something went wrong with the API", { type: "warning" });
        } finally {
          setIsSaving(false);
        }
      }
    },
    [reload, onClose, existingId, snackbar, state.user]
  );

  return (
    <Modal open={open} onClose={onClose} size="small">
      <form onSubmit={handleSubmit(soSave)}>
        {existing && (
          <UploadArtistImage
            existing={existing}
            reload={reload}
            imageType="banner"
            height="125px"
            width="100%"
            maxDimensions="2500x500"
          />
        )}
        {/* {existing && (
          <UploadArtistImage
            existing={existing}
            reload={reload}
            imageType="avatar"
            height="120px"
            width="120px"
            maxDimensions="1500x1500"
          />
        )} */}

        <div
          className={css`
            margin-top: 1rem;
          `}
        >
          <h3>{existing ? existing.name : "New artist"}</h3>
          <FormComponent>
            Display name: <InputEl {...register("name")} />
          </FormComponent>
          <FormComponent>
            Bio:
            <TextArea {...register("bio")} />
          </FormComponent>
          {/* <FormComponent>
            Email: <InputEl type="email" {...register("email")} />
          </FormComponent> */}

          <Button
            type="submit"
            disabled={isSaving}
            startIcon={isSaving ? <LoadingSpinner /> : undefined}
          >
            {existing ? "Save" : "Create"} artist
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default ArtistForm;
