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
import { css } from "@emotion/css";
import { fmtMSS } from "utils/tracks";

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

const fileListIntoArray = (fileList: FileList) => {
  if (fileList?.length > 0) {
    const files = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList.item(i);
      if (file) {
        files.push(file);
      }
    }
    return files;
  }

  return [];
};

const parse = async (files: File[]) => {
  const parsed = await Promise.all(
    files.map(async (file) => await parseAudioMetadata(file))
  );
  return parsed;
};

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

          const fileArray = fileListIntoArray(data.trackFiles);
          await Promise.all(
            fileArray.map(async (f) => {
              console.log("parsed", f);
              const parsed = await parseAudioMetadata(f);
              const result = await api.post<Partial<Track>, { track: Track }>(
                `users/${userId}/tracks`,
                {
                  ...parsed,
                  artistId: trackgroup.artistId,
                  trackGroupId: trackgroup.id,
                }
              );
              await api.uploadFile(
                `users/${userId}/tracks/${result.track.id}/audio`,
                [f]
              );
            })
          );
          snackbar("Tracks uploaded", { type: "success" });
        }
      } catch (e) {
        console.error(e);
        snackbar("There was a problem with the API", { type: "warning" });
      } finally {
        setIsSaving(false);
        await reload();
      }
    },
    [userId, snackbar, trackgroup.artistId, trackgroup.id, reload]
  );

  const processUploadedFiles = React.useCallback((filesToProcess: FileList) => {
    const filesToParse = fileListIntoArray(filesToProcess);
    (async () => {
      const parsed = await parse(filesToParse);

      setParsedFiles(parsed);
    })();
  }, []);

  React.useEffect(() => {
    processUploadedFiles(trackFiles);
  }, [processUploadedFiles, trackFiles]);

  return (
    <form
      onSubmit={handleSubmit(doAddTrack)}
      className={css`
        margin-top: 1rem;
      `}
    >
      <h4>{t("uploadTracks")}</h4>
      {parsedFiles && (
        <>
          {t("addTheFollowingTracks")}
          <Table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Artist</th>
                <th>Duration</th>
                <th>Metadata</th>
              </tr>
            </thead>
            <tbody>
              {parsedFiles.map((t) => (
                <tr>
                  <td>{t.title}</td>
                  <td>{t.artist}</td>
                  <td>{t.duration && fmtMSS(+t.duration)}</td>
                  <td>{JSON.stringify(t)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </>
      )}
      {parsedFiles.length > 0 && (
        <Button
          type="submit"
          disabled={isSaving}
          startIcon={isSaving ? <LoadingSpinner /> : undefined}
        >
          {t("uploadTracks")}
        </Button>
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
    </form>
  );
};

export default BulkTrackUpload;
