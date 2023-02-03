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

const AlbumForm: React.FC<{
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
    published: boolean;
    title: string;
    type: TrackGroup["type"];
    releaseDate: string;
    about: string;
    newCover: File[];
  }>({
    defaultValues: existing ?? {
      published: false,
    },
  });

  const existingId = existing?.id;

  const doSave = React.useCallback(
    async (data: {
      title: string;
      published: boolean;
      type: string;
      releaseDate: string;
      about: string;
      newCover: File[];
      // cover: string | File[];
    }) => {
      if (user?.id) {
        try {
          setIsSaving(true);
          let savedId = existingId;
          console.log("existingId", existingId);
          if (existingId) {
            console.log("aving");
            await api.put(`users/${user.id}/trackGroups/${existingId}`, {
              ...pick(data, [
                "title",
                "private",
                "type",
                "releaseDate",
                "about",
              ]),
              artistId: artist.id,
              cover: data.newCover,
            });
          } else {
            const newGroup = await api.post<
              { title?: string; artistId: number; cover?: File[] },
              { id: number }
            >(`users/${user.id}/trackGroups`, {
              ...pick(data, [
                "title",
                "private",
                "type",
                "releaseDate",
                "about",
              ]),
              cover: data.newCover,
              artistId: artist.id,
            });
            savedId = newGroup.id;
          }
          // data cover is a string if the form hasn't been changed.
          // if (savedId && data.cover[0] && typeof data.cover[0] !== "string") {
          //   await uploadTrackGroupCover(savedId, data.cover[0]);
          // }
          snackbar("Trackgroup updated", { type: "success" });
          onClose?.();
        } catch (e) {
          snackbar("There was a problem with the API", { type: "warning" });
        } finally {
          setIsSaving(false);
          await reload();
        }
      }
    },
    [reload, existingId, snackbar, artist.id, onClose, user?.id]
  );

  return (
    <form onSubmit={handleSubmit(doSave)}>
      <h4>
        {existing ? "Edit" : "New"} Album for {artist.name}
      </h4>

      {/* <FormComponent>
        Display artist: <InputEl {...register("display_artist")} />
      </FormComponent> */}
      <FormComponent>
        Title: <InputEl {...register("title")} />
      </FormComponent>
      <FormComponent
        className={css`
          margin-top: 0.5rem;
          display: flex;
        `}
      >
        <input id="private" type="checkbox" {...register("published")} />{" "}
        <label htmlFor="private">
          Is published?
          <small>published albums can be bought and listened to</small>
        </label>
      </FormComponent>
      <FormComponent
        style={{
          flexDirection: "column",
          display: "flex",
          alignItems: "flex-start",
        }}
      >
        Cover:
        {existing?.cover && <img src={existing.cover.url} alt="album cover" />}
      </FormComponent>
      <FormComponent>
        <InputEl
          type="file"
          id="audio"
          {...register("newCover")}
          accept="image/*"
        />
      </FormComponent>
      <FormComponent>
        Type:{" "}
        <SelectEl defaultValue="lp" {...register("type")}>
          <option value="lp">LP</option>
          <option value="ep">EP</option>
        </SelectEl>
      </FormComponent>
      <FormComponent>
        Release date: <InputEl type="date" {...register("releaseDate")} />
      </FormComponent>
      <FormComponent>
        About: <TextArea {...register("about")} />
      </FormComponent>
      <Button
        type="submit"
        disabled={isSaving}
        startIcon={isSaving ? <LoadingSpinner /> : undefined}
      >
        {existing ? "Save" : "Submit"} Album
      </Button>
    </form>
  );
};

export default AlbumForm;
