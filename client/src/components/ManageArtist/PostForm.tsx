import React from "react";

import { useForm } from "react-hook-form";
import Button from "../common/Button";
import { InputEl } from "../common/Input";
import { SelectEl } from "../common/Select";
import TextArea from "../common/TextArea";
import FormComponent from "components/common/FormComponent";
import { useSnackbar } from "state/SnackbarContext";
import { pick } from "lodash";
import { css } from "@emotion/css";
import LoadingSpinner from "components/common/LoadingSpinner";
import api from "../../services/api";
import { useGlobalStateContext } from "state/GlobalState";

const PostForm: React.FC<{
  existing?: TrackGroup;
  reload: () => Promise<void>;
  artist: Artist;
  onClose?: () => void;
}> = ({ reload, artist, existing, onClose }) => {
  const {
    state: { user },
  } = useGlobalStateContext();
  const snackbar = useSnackbar();
  const [isSaving, setIsSaving] = React.useState(false);
  const { register, handleSubmit } = useForm<{
    title: string;
    publishedAt: string;
    content: string;
  }>({
    defaultValues: existing ?? {
      publishedAt: new Date().toISOString(),
    },
  });

  const existingId = existing?.id;
  const userId = user?.id;

  const doSave = React.useCallback(
    async (data: { title: string; publishedAt: string; content: string }) => {
      if (userId) {
        try {
          setIsSaving(true);
          let savedId = existingId;
          if (existingId) {
            await api.put(`users/${userId}/posts/${existingId}`, {
              ...pick(data, ["title", "publishedAt", "content"]),
              artistId: artist.id,
            });
          } else {
            const newGroup = await api.post<
              { title?: string; artistId: number; cover?: File[] },
              { id: number }
            >(`users/${userId}/posts`, {
              ...pick(data, ["title", "content", "publishedAt"]),
              artistId: artist.id,
            });
            savedId = newGroup.id;
          }
          // data cover is a string if the form hasn't been changed.

          snackbar("Post updated", { type: "success" });
          onClose?.();
        } catch (e) {
          snackbar("There was a problem with the API", { type: "warning" });
        } finally {
          setIsSaving(false);
          await reload();
        }
      }
    },
    [reload, existingId, snackbar, artist.id, onClose, userId]
  );

  return (
    <form onSubmit={handleSubmit(doSave)}>
      <h4>
        {existing ? "Edit" : "New"} blog post for {artist.name}
      </h4>

      {/* <FormComponent>
        Display artist: <InputEl {...register("display_artist")} />
      </FormComponent> */}
      <FormComponent>
        Title: <InputEl {...register("title")} />
      </FormComponent>
      <FormComponent>
        Publication date: <InputEl type="date" {...register("publishedAt")} />
      </FormComponent>
      <FormComponent>
        Content: <TextArea {...register("content")} />
      </FormComponent>
      <Button
        type="submit"
        disabled={isSaving}
        startIcon={isSaving ? <LoadingSpinner /> : undefined}
      >
        {existing ? "Save" : "Save new"} post
      </Button>
    </form>
  );
};

export default PostForm;
