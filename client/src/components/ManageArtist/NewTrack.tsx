import React from "react";
import Button from "../common/Button";
import { useFieldArray, useForm } from "react-hook-form";
import api from "services/api";
import { InputEl } from "../common/Input";
import { SelectEl } from "../common/Select";
import FormComponent from "components/common/FormComponent";
import { useSnackbar } from "state/SnackbarContext";
import LoadingSpinner from "components/common/LoadingSpinner";
import { useGlobalStateContext } from "state/GlobalState";
import Table from "components/common/Table";

export interface ShareableTrackgroup {
  creatorId: number;
  slug: string;
}

interface FormData {
  title: string;
  status: Track["status"];
  trackFile: File[];
  trackArtists: { artistName?: string; artistId?: string; role?: string }[];
}

export const NewTrack: React.FC<{
  trackgroup: TrackGroup;
  reload: () => Promise<void>;
}> = ({ trackgroup, reload }) => {
  const { register, handleSubmit, control } = useForm<FormData>();
  const { fields, append } = useFieldArray({
    control,
    name: "trackArtists",
  });

  const {
    state: { user },
  } = useGlobalStateContext();

  const [isSaving, setIsSaving] = React.useState(false);
  const snackbar = useSnackbar();

  const userId = user?.id;

  const doAddTrack = React.useCallback(
    async (data: FormData) => {
      try {
        if (userId) {
          setIsSaving(true);
          const trackArtists = data.trackArtists
            .filter((ta) => !(ta.artistName === "" && ta.artistId === ""))
            .map((ta) => ({
              ...ta,
              artistId: ta.artistId ? +ta.artistId : undefined,
            }));
          const result = await api.post<Partial<Track>, { track: Track }>(
            `users/${userId}/tracks`,
            {
              ...data,
              artistId: trackgroup.artistId,
              trackGroupId: trackgroup.id,
              trackArtists,
            }
          );

          if (data.trackFile[0] && typeof data.trackFile[0] !== "string")
            await api.uploadFile(
              `users/${userId}/tracks/${result.track.id}/audio`,
              data.trackFile
            );
          snackbar("Track uploaded", { type: "success" });
        }
      } catch (e) {
        console.error(e);
        snackbar("There was a problem with the API", { type: "warning" });
      } finally {
        setIsSaving(false);
        await reload();
      }
    },
    [userId, trackgroup.artistId, trackgroup.id, snackbar, reload]
  );

  return (
    <form onSubmit={handleSubmit(doAddTrack)}>
      <h4>New Track</h4>
      <FormComponent>
        Title: <InputEl {...register("title")} />
      </FormComponent>
      <FormComponent>
        Status:{" "}
        <SelectEl defaultValue="paid" {...register("status")}>
          <option value="preview">Preview</option>
          <option value="must-own">Must own</option>
        </SelectEl>
      </FormComponent>
      <FormComponent>
        <InputEl
          type="file"
          id="audio"
          {...register("trackFile")}
          accept="audio/mpeg,audio/flac,audio/wav,audio/x-flac,audio/aac,audio/aiff,audio/x-m4a"
        />
      </FormComponent>
      <FormComponent>
        Want to credit an artist on this track?
        <Table>
          <thead>
            <tr>
              <th />
              <th>
                {" "}
                <small>How the artist's name should appear publically</small>
              </th>
              <th>
                <small>
                  Is this an existing artist in Mirlo? Add their ID if so.
                </small>
              </th>
              <th>
                <small>What role did the artist have?</small>
              </th>
            </tr>
          </thead>
          <tbody>
            {fields.map((f, number) => (
              <tr>
                <td>Artist</td>
                <td>
                  <InputEl {...register(`trackArtists.${number}.artistName`)} />
                </td>
                <td>
                  <InputEl {...register(`trackArtists.${number}.artistId`)} />
                </td>
                <td>
                  <InputEl {...register(`trackArtists.${number}.role`)} />
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
        <Button compact type="button" onClick={() => append({})}>
          Add additional artists
        </Button>
      </FormComponent>
      <Button
        type="submit"
        disabled={isSaving}
        startIcon={isSaving ? <LoadingSpinner /> : undefined}
      >
        Add track
      </Button>
    </form>
  );
};

export default NewTrack;
