import React from "react";
import Button from "../common/Button";
import { useForm } from "react-hook-form";
import api from "services/api";
import { InputEl } from "../common/Input";
import { SelectEl } from "../common/Select";
import FormComponent from "components/common/FormComponent";
import { useSnackbar } from "state/SnackbarContext";
import LoadingSpinner from "components/common/LoadingSpinner";

export interface ShareableTrackgroup {
  creatorId: number;
  slug: string;
}

export const NewTrack: React.FC<{
  trackgroup: TrackGroup;
  reload: () => Promise<void>;
}> = ({ trackgroup, reload }) => {
  const { register, handleSubmit } = useForm<{
    title: string;
    status: Track["status"];
  }>();
  const [isSaving, setIsSaving] = React.useState(false);
  const snackbar = useSnackbar();

  const doAddTrack = React.useCallback(
    async (data: Partial<Track>) => {
      try {
        setIsSaving(true);
        const track = await api.post<Partial<Track>, Track>("track", {
          ...data,
          artistId: trackgroup.artistId,
        });
        // await uploadTrackFile(track.id, data);
        await await api.post(`trackGroup/${trackgroup.id}/tracks/add`, {
          tracks: [
            {
              trackId: track.id,
            },
          ],
        });
        snackbar("Track uploaded", { type: "success" });
      } catch (e) {
        console.error(e);
        snackbar("There was a problem with the API", { type: "warning" });
      } finally {
        setIsSaving(false);
        await reload();
      }
    },
    [trackgroup.id, trackgroup.artistId, reload, snackbar]
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

      {/* <FormComponent>
        <InputEl
          type="file"
          id="audio"
          {...register("upload")}
          accept="audio/mpeg,audio/flac"
        />
      </FormComponent> */}
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
