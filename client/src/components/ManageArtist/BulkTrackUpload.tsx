import React from "react";
import Button from "../common/Button";
import { FormProvider, useFieldArray, useForm } from "react-hook-form";
import api from "services/api";
import { InputEl } from "../common/Input";
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
import { FaQuestionCircle } from "react-icons/fa";

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
  id3: { [key: string]: any };
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
  const { register, handleSubmit, watch, control, reset } = methods;
  const [uploadJobs, setUploadJobs] = React.useState<
    { jobId: string; jobStatus: string }[]
  >([]);
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
          const uploadJobIds = await Promise.all(
            data.tracks.map(async (f) => {
              console.log("parsed", f);
              const result = await api.post<Partial<Track>, { track: Track }>(
                `users/${userId}/tracks`,
                {
                  ...f,
                  artistId: trackgroup.artistId,
                  trackGroupId: trackgroup.id,
                  trackArtists: f.trackArtists.map((a) => ({
                    ...a,
                    artistId:
                      a.artistId && isFinite(+a.artistId)
                        ? +a.artistId
                        : undefined,
                  })),
                }
              );
              const jobInfo = await api.uploadFile(
                `users/${userId}/tracks/${result.track.id}/audio`,
                [f.file]
              );

              return jobInfo.result.jobId;
            })
          );
          console.log("uploadJobIds", uploadJobIds);
          setUploadJobs(
            uploadJobIds.map((id) => ({ jobId: id, jobStatus: "waiting" }))
          );

          snackbar("Uploading tracks...", { type: "success" });
        }
      } catch (e) {
        console.error(e);
        snackbar("There was a problem with the API", { type: "warning" });
      } finally {
        setIsSaving(false);
        // await reload();
      }
    },
    [userId, snackbar, trackgroup.artistId, trackgroup.id]
  );

  const processUploadedFiles = React.useCallback(
    (filesToProcess: FileList) => {
      const filesToParse = fileListIntoArray(filesToProcess);
      (async () => {
        const parsed = await parse(filesToParse);
        replace(
          parsed
            .sort((a, b) => (a.metadata.track > b.metadata.track ? 1 : -1))
            .map((p) => ({
              id3: p.metadata,
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
    [replace, trackgroup.artist?.name, trackgroup.artistId]
  );

  React.useEffect(() => {
    let timer: NodeJS.Timer | undefined;
    if (uploadJobs.length > 0) {
      timer = setInterval(async () => {
        const result = await api.getMany<{ jobStatus: string; jobId: string }>(
          `jobs?${uploadJobs.map((job) => `ids=${job.jobId}&`).join("")}`
        );

        if (result.results.some((r) => r.jobStatus !== "completed")) {
          setUploadJobs(result.results);
        } else {
          setUploadJobs([]);
          await reload();
          reset();
        }
      }, 3000);
    }
    return () => clearInterval(timer);
  }, [reload, uploadJobs, reset]);

  React.useEffect(() => {
    processUploadedFiles(trackFiles);
  }, [processUploadedFiles, trackFiles]);

  const disableUploadButton = isSaving || uploadJobs.length > 0;

  console.log("uploadJobs", uploadJobs);

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
                      min-width: 50px;
                    `}
                  ></th>
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
                  <th className="alignRight">{t("metadata")}</th>
                </tr>
              </thead>
              <tbody>
                {fields.map((t, idx) => (
                  <BulkTrackUploadRow
                    track={t}
                    key={t.title}
                    index={idx}
                    uploadingState={uploadJobs?.[idx]?.jobStatus}
                  />
                ))}
              </tbody>
            </Table>
            {fields.length > 0 && (
              <Button
                type="submit"
                disabled={disableUploadButton}
                startIcon={disableUploadButton ? <LoadingSpinner /> : undefined}
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
            disabled={disableUploadButton}
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
