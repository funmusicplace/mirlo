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

const PostForm: React.FC<{
  existing?: Post;
  reload: () => Promise<void>;
  artist: Artist;
  onClose?: () => void;
}> = ({ reload, artist, existing, onClose }) => {
  const {
    state: { user },
  } = useGlobalStateContext();
  const snackbar = useSnackbar();
  const [isSaving, setIsSaving] = React.useState(false);

  const publishedAt = existing ? new Date(existing.publishedAt) : new Date();
  publishedAt.setMinutes(
    publishedAt.getMinutes() - publishedAt.getTimezoneOffset()
  );

  const { register, handleSubmit } = useForm<{
    title: string;
    publishedAt: string;
    content: string;
  }>({
    defaultValues: existing
      ? { ...existing, publishedAt: publishedAt.toISOString().slice(0, 16) }
      : {
          publishedAt: publishedAt.toISOString().slice(0, 16),
        },
  });

  const existingId = existing?.id;
  const userId = user?.id;

  const doSave = React.useCallback(
    async (data: { title: string; publishedAt: string; content: string }) => {
      if (userId) {
        try {
          setIsSaving(true);
          if (existingId) {
            // const timezoneOffset =
            await api.put(`users/${userId}/posts/${existingId}`, {
              ...pick(data, ["title", "content"]),
              publishedAt: new Date(data.publishedAt + ":00").toISOString(),
              artistId: artist.id,
            });
          } else {
            await api.post<
              { title?: string; artistId: number; cover?: File[] },
              { id: number }
            >(`users/${userId}/posts`, {
              ...pick(data, ["title", "content", "publishedAt"]),
              artistId: artist.id,
            });
          }

          snackbar("Post updated", { type: "success" });
          reload?.();
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
        Publication date:{" "}
        <InputEl type="datetime-local" {...register("publishedAt")} />
      </FormComponent>
      <FormComponent>
        Content: <TextArea {...register("content")} rows={10} />
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
