import React from "react";
import Button from "../common/Button";
import { useForm } from "react-hook-form";
import api from "services/api";
import { InputEl } from "../common/Input";
import { SelectEl } from "../common/Select";
import FormComponent from "components/common/FormComponent";
import { useSnackbar } from "state/SnackbarContext";
import LoadingSpinner from "components/common/LoadingSpinner";
import { useGlobalStateContext } from "state/GlobalState";

export interface ShareableTrackgroup {
  creatorId: number;
  slug: string;
}

interface FormData {
  title: string;
  status: Track["status"];
  trackFile: File[];
}

export const NewTrack: React.FC<{
  trackgroup: TrackGroup;
  reload: () => Promise<void>;
}> = ({ trackgroup, reload }) => {
  const { register, handleSubmit } = useForm<FormData>();
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
          const result = await api.post<Partial<Track>, { track: Track }>(
            `users/${userId}/tracks`,
            {
              ...data,
              artistId: trackgroup.artistId,
              trackGroupId: trackgroup.id,
            }
          );
          // await api.post(
          //   `users/${userId}/trackGroup/${trackgroup.id}/tracks/add`,
          //   {
          //     tracks: [
          //       {
          //         trackId: track.id,
          //       },
          //     ],
          //   }
          // );
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
