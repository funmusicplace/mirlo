import React from "react";
import Button from "../common/Button";
import { FormProvider, useFieldArray, useForm } from "react-hook-form";
import api from "services/api";
import { InputEl } from "../common/Input";
import { SelectEl } from "../common/Select";
import FormComponent from "components/common/FormComponent";
import { useSnackbar } from "state/SnackbarContext";
import LoadingSpinner from "components/common/LoadingSpinner";
import { useGlobalStateContext } from "state/GlobalState";
import Table from "components/common/Table";
import { useTranslation } from "react-i18next";
// import parseAudioMetadata from "parse-audio-metadata";
import { css } from "@emotion/css";
import parseAudioMetadata from "id3-parser";
import { convertFileToBuffer } from "id3-parser/lib/util";
import { BulkTrackUploadRow } from "./BulkTrackUploadRow";
import Tooltip from "components/common/Tooltip";
import { FaQuestion, FaQuestionCircle } from "react-icons/fa";

export interface ShareableTrackgroup {
  creatorId: number;
  slug: string;
}

export interface TrackData {
  duration: number;
  file: File;
  title: string;
  status: Track["status"];
  track: string;
  metadata: { [key: string]: any };
  trackArtists: { artistName?: string; artistId?: number; role?: string }[];
}

interface FormData {
  trackFiles: FileList;
  tracks: TrackData[];
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

interface MetaData {
  duration: number;
  title: string;
  artist: string;
  track: string;
}

const parse = async (
  files: File[]
): Promise<{ file: File; metadata: MetaData }[]> => {
  const parsed = await Promise.all(
    files.map(async (file) => ({
      file,
      metadata: (await parseAudioMetadata(
        await convertFileToBuffer(file)
      )) as unknown as MetaData,
    }))
  );
  return parsed;
};

export const BulkTrackUpload: React.FC<{
  trackgroup: TrackGroup;
  reload: () => Promise<void>;
}> = ({ trackgroup, reload }) => {
  const { t } = useTranslation("translation", { keyPrefix: "manageAlbum" });
  const methods = useForm<FormData>();
  const { register, handleSubmit, watch, control } = methods;
  const { fields, replace } = useFieldArray({
    control,
    name: "tracks",
  });

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

          console.log("data", data.tracks);
          // await Promise.all(
          //   fileArray.map(async (f) => {
          //     console.log("parsed", f);
          //     const parsed = await parseAudioMetadata(f);
          //     const result = await api.post<Partial<Track>, { track: Track }>(
          //       `users/${userId}/tracks`,
          //       {
          //         ...parsed,
          //         artistId: trackgroup.artistId,
          //         trackGroupId: trackgroup.id,
          //       }
          //     );
          //     await api.uploadFile(
          //       `users/${userId}/tracks/${result.track.id}/audio`,
          //       [f]
          //     );
          //   })
          // );
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
    [userId, snackbar, reload]
  );

  const processUploadedFiles = React.useCallback(
    (filesToProcess: FileList) => {
      const filesToParse = fileListIntoArray(filesToProcess);
      (async () => {
        const parsed = await parse(filesToParse);
        console.log("parsed", parsed);
        replace(
          parsed
            .sort((a, b) => (a.metadata.track > b.metadata.track ? 1 : -1))
            .map((p) => ({
              metadata: p.metadata,
              duration: p.metadata.duration,
              track: p.metadata.track,
              file: p.file,
              title: p.metadata.title,
              status: "must-own",
              trackArtists: [
                {
                  artistName: p.metadata.artist,
                  isCoAuthor: true,
                  artistId:
                    p.metadata.artist === trackgroup.artist?.name
                      ? trackgroup.artistId
                      : undefined,
                },
              ],
            }))
        );
      })();
    },
    [replace]
  );

  React.useEffect(() => {
    processUploadedFiles(trackFiles);
  }, [processUploadedFiles, trackFiles]);

  return (
    <FormProvider {...methods}>
      <form
        onSubmit={handleSubmit(doAddTrack)}
        className={css`
          margin-top: 1rem;
        `}
      >
        <h4>{t("uploadTracks")}</h4>
        {fields && (
          <>
            {t("addTheFollowingTracks")}
            <Table
              className={css`
                font-size: 14px;
                input {
                  margin-bottom: 0;
                  font-size: 14px;
                }

                button {
                  font-size: 14px;
                }

                select {
                  font-size: 14px;
                }
              `}
            >
              <thead>
                <tr>
                  <th
                    className={css`
                      min-width: 200px;
                    `}
                  >
                    {t("trackTitle")}{" "}
                    <Tooltip hoverText={t("trackTitleHelp")}>
                      <FaQuestionCircle />
                    </Tooltip>
                  </th>
                  <th>
                    {t("artists")}{" "}
                    <Tooltip hoverText={t("trackArtistsHelp")}>
                      <FaQuestionCircle />
                    </Tooltip>
                  </th>
                  <th>
                    {t("status")}{" "}
                    <Tooltip hoverText={t("statusHelp")}>
                      <FaQuestionCircle />
                    </Tooltip>
                  </th>
                  <th>{t("metadata")})</th>
                </tr>
              </thead>
              <tbody>
                {fields.map((t, idx) => (
                  <BulkTrackUploadRow track={t} key={t.title} index={idx} />
                ))}
              </tbody>
            </Table>
            {fields.length > 0 && (
              <Button
                type="submit"
                disabled={isSaving}
                startIcon={isSaving ? <LoadingSpinner /> : undefined}
              >
                {t("uploadTracks")}
              </Button>
            )}
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
      </form>
    </FormProvider>
  );
};

export default BulkTrackUpload;
