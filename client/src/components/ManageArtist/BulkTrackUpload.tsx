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
import { useTranslation } from "react-i18next";
import parseAudioMetadata from "parse-audio-metadata";

export interface ShareableTrackgroup {
  creatorId: number;
  slug: string;
}

interface FormData {
  title: string;
  status: Track["status"];
  trackFiles: FileList;
  trackArtists: { artistName?: string; artistId?: string; role?: string }[];
}

export const BulkTrackUpload: React.FC<{
  trackgroup: TrackGroup;
  reload: () => Promise<void>;
}> = ({ trackgroup, reload }) => {
  const { t } = useTranslation("translation", { keyPrefix: "manageAlbum" });

  const [parsedFiles, setParsedFiles] = React.useState<
    {
      [key: string]: any;
    }[]
  >([]);
  const { register, handleSubmit, watch } = useForm<FormData>();

  const {
    state: { user },
  } = useGlobalStateContext();

  const trackFiles = watch("trackFiles");

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

          if (data.trackFiles[0] && typeof data.trackFiles[0] !== "string")
            // await api.uploadFile(
            //   `users/${userId}/tracks/${result.track.id}/audio`,
            //   data.trackFiles
            // );
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

  React.useEffect(() => {
    const parse = async (files: File[]) => {
      const parsed = await Promise.all(
        files.map(async (file) => await parseAudioMetadata(file))
      );
      setParsedFiles(parsed);
    };
    console.log("trackFiles", trackFiles);
    if (trackFiles?.length > 0) {
      const files = [];

      for (let i = 0; i < trackFiles.length; i++) {
        const file = trackFiles.item(i);
        if (file) {
          files.push(file);
        }
      }
      parse(files);
      // setParsedFiles(files);
    }
  }, [trackFiles]);

  console.log("parsed", parsedFiles);

  return (
    <form onSubmit={handleSubmit(doAddTrack)}>
      <h4>{t("uploadTracks")}</h4>
      {parsedFiles && (
        <>
          {t("addTheFollowingTracks")}
          <Table>
            {parsedFiles.map((t) => (
              <tr>
                <td>{t.title}</td>
                <td>{t.artist}</td>
                <td>{JSON.stringify(t)}</td>
              </tr>
            ))}
          </Table>
        </>
      )}
      <FormComponent>
        <InputEl
          type="file"
          id="audio"
          multiple
          {...register("trackFiles")}
          accept="audio/mpeg,audio/flac,audio/wav,audio/x-flac,audio/aac,audio/aiff,audio/x-m4a"
        />
      </FormComponent>
      <Button
        type="submit"
        disabled={isSaving}
        startIcon={isSaving ? <LoadingSpinner /> : undefined}
      >
        {t("uploadTracks")}
      </Button>
    </form>
  );
};

export default BulkTrackUpload;
