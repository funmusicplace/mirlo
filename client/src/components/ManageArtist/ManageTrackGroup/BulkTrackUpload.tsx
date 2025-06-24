import React from "react";
import { FormProvider, useForm } from "react-hook-form";
import api from "services/api";
import FormComponent from "components/common/FormComponent";
import { useTranslation } from "react-i18next";
import { css } from "@emotion/css";
import { BulkTrackUploadRow } from "./BulkTrackUploadRow";

import { Buffer } from "buffer";
import process from "process";
import { pick } from "lodash";
import {
  TrackData,
  UploadField,
  UploadLabelWrapper,
  convertMetaData,
  fileListIntoArray,
  parse,
  produceNewStatus,
} from "../utils";
import { useAuthContext } from "state/AuthContext";
import { useSnackbar } from "state/SnackbarContext";

if (typeof window !== "undefined" && typeof window.Buffer === "undefined") {
  window.Buffer = Buffer;
}

if (typeof window !== "undefined" && typeof window.process === "undefined") {
  window.process = process;
}

const timeInBetweenUploads = 5000;

interface FormData {
  trackFiles: FileList;
  tracks: TrackData[];
}

type OrderedTrackData = { order: number; t: TrackData };

const alertUser = (event: any) => {
  event.preventDefault();
  event.returnValue = "";
};

export const BulkTrackUpload: React.FC<{
  trackgroup: { artistId?: number; id: number; tracks: Track[] };
  reload: (newTrack?: Track) => Promise<unknown>;
  multiple?: boolean;
}> = ({ trackgroup, reload, multiple }) => {
  const snackbar = useSnackbar();
  const { t } = useTranslation("translation", { keyPrefix: "manageAlbum" });
  const methods = useForm<FormData>();
  const { register, watch, reset } = methods;
  const [uploadQueue, setUploadQueue] = React.useState<
    { title: string; status: number }[]
  >([]);

  const { user } = useAuthContext();

  const trackFiles = watch("trackFiles");

  const userId = user?.id;

  const uploadNextTrack = React.useCallback(
    async (remainingTracks: OrderedTrackData[]) => {
      const firstTrack = remainingTracks.pop();
      if (firstTrack) {
        const metadata = pick(firstTrack.t.metadata, ["format", "common"]);
        delete metadata.common.picture;

        const packet = {
          title: firstTrack.t.title,
          metadata: metadata,
          artistId: trackgroup.artistId,
          isPreview: firstTrack.t.status === "preview",
          order: firstTrack.order,
          lyrics: Array.isArray(firstTrack.t.lyrics)
            ? firstTrack.t.lyrics.join("\n")
            : firstTrack.t.lyrics,
          isrc: firstTrack.t.isrc,
          trackGroupId: trackgroup.id,
          trackArtists: firstTrack.t.trackArtists.map((a) => ({
            ...a,
            artistId:
              a.artistId && isFinite(+a.artistId) ? +a.artistId : undefined,
          })),
        };

        setUploadQueue((queue) =>
          produceNewStatus(queue, firstTrack.t.title, 15)
        );

        let newTrack: Track | undefined = undefined;

        try {
          const response = await api.post<Partial<Track>, { result: Track }>(
            `manage/tracks`,
            packet
          );
          newTrack = response.result;
          setUploadQueue((queue) =>
            produceNewStatus(queue, firstTrack.t.title, 25)
          );
          await api.uploadFile(`manage/tracks/${newTrack.id}/audio`, [
            firstTrack.t.file,
          ]);
        } catch (e) {
          snackbar(
            `Something went wrong uploading track ${packet.title}. Please report this incident to hi@mirlo.space`,
            {
              type: "warning",
            }
          );
        }

        if (remainingTracks.length !== 0) {
          setUploadQueue((queue) =>
            produceNewStatus(queue, firstTrack.t.title, 99)
          );

          setTimeout(async () => {
            setUploadQueue((queue) =>
              produceNewStatus(queue, firstTrack.t.title, 100)
            );
            reload(newTrack);
          }, timeInBetweenUploads / 2);

          setTimeout(async () => {
            await uploadNextTrack(remainingTracks);
          }, timeInBetweenUploads);
        } else {
          await uploadNextTrack(remainingTracks);
          reload(newTrack);
        }
      } else {
        setUploadQueue([]);
        reload();
        reset();
      }
    },
    [reload, reset, trackgroup.artistId, trackgroup.id, userId]
  );

  const processUploadedFiles = React.useCallback(
    (filesToProcess: FileList) => {
      const filesToParse = fileListIntoArray(filesToProcess);
      const callback = async () => {
        const parsed = await parse(filesToParse);
        const newTracks = parsed
          .sort((a, b) => {
            const firstComparable = a.metadata.common.track.no ?? a.file.name;
            const secondComparable = b.metadata.common.track.no ?? b.file.name;

            return (firstComparable ?? 0) > (secondComparable ?? 0) ? 1 : -1;
          })
          .map((p, i) => convertMetaData(p, i, trackgroup))
          .map((t, i) => ({
            order: Number.isFinite(+t.order) ? Number(t.order) : i + 1,
            t,
          }));
        setUploadQueue(newTracks.map((t) => ({ title: t.t.title, status: 5 })));
        uploadNextTrack(newTracks);
      };

      callback();
    },
    [trackgroup, uploadNextTrack]
  );

  React.useEffect(() => {
    if (uploadQueue.length === 0 && trackFiles?.length > 0) {
      processUploadedFiles(trackFiles);
    }
  }, [processUploadedFiles, trackFiles, uploadQueue.length]);

  React.useEffect(() => {
    if (uploadQueue.length > 0) {
      window.addEventListener("beforeunload", alertUser);
      return () => {
        window.removeEventListener("beforeunload", alertUser);
      };
    } else {
      window.removeEventListener("beforeunload", alertUser);
    }
  }, [uploadQueue.length]);

  const disableUploadButton = uploadQueue.length > 0;

  return (
    <FormProvider {...methods}>
      <form
        className={css`
          margin-top: 1rem;
        `}
      >
        {uploadQueue.length > 0 && (
          <div
            className={css`
              margin-bottom: 1rem;
            `}
          >
            {uploadQueue.map((t) => (
              <BulkTrackUploadRow track={t} key={t.title} />
            ))}
          </div>
        )}{" "}
        <p>{t("uploadTracksDescription")}</p>
        <FormComponent>
          <UploadLabelWrapper htmlFor="audio">
            <div>{t("dropFilesHere")}</div>

            <UploadField
              type="file"
              id="audio"
              disabled={disableUploadButton}
              multiple={multiple}
              {...register("trackFiles")}
              accept="audio/flac,audio/wav,audio/x-wav,audio/x-flac,audio/aac,audio/aiff,audio/x-m4a"
            />
          </UploadLabelWrapper>
        </FormComponent>
      </form>
    </FormProvider>
  );
};

export default BulkTrackUpload;
