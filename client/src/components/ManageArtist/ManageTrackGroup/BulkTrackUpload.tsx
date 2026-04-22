import React from "react";
import { FormProvider, useForm } from "react-hook-form";
import FormComponent from "components/common/FormComponent";
import { useTranslation } from "react-i18next";
import { css } from "@emotion/css";
import { BulkTrackUploadRow } from "./BulkTrackUploadRow";
import { Buffer } from "buffer";
import process from "process";
import { useUpload } from "state/UploadContext";
import UploadFiles from "components/ManageArtist/UploadFiles";

if (typeof window !== "undefined" && typeof window.Buffer === "undefined") {
  window.Buffer = Buffer;
}

if (typeof window !== "undefined" && typeof window.process === "undefined") {
  window.process = process;
}

interface FormData {
  trackFiles: FileList;
}

export const BulkTrackUpload: React.FC<{
  trackgroup: { artistId?: number; id: number; tracks: Track[] };
  reload: (newTrack?: Track) => Promise<unknown>;
  multiple?: boolean;
}> = ({ trackgroup, reload, multiple }) => {
  const { t } = useTranslation("translation", { keyPrefix: "manageAlbum" });
  const methods = useForm<FormData>();
  const { register, watch, reset } = methods;
  const { queue, enqueue } = useUpload();

  const trackFiles = watch("trackFiles");

  const itemsForThisGroup = React.useMemo(
    () => queue.filter((q) => q.trackGroupId === trackgroup.id),
    [queue, trackgroup.id]
  );

  const hasActiveUpload = itemsForThisGroup.length > 0;

  React.useEffect(() => {
    if (trackFiles?.length > 0 && !hasActiveUpload) {
      enqueue({ trackgroup, files: trackFiles, reload });
      reset();
    }
  }, [trackFiles, hasActiveUpload, enqueue, trackgroup, reload, reset]);

  return (
    <FormProvider {...methods}>
      <form
        className={css`
          margin-top: 1rem;
        `}
      >
        {hasActiveUpload && (
          <div
            className={css`
              margin-bottom: 1rem;
            `}
          >
            {itemsForThisGroup.map((item) => (
              <BulkTrackUploadRow track={item} key={item.title} />
            ))}
          </div>
        )}
        <FormComponent>
          <UploadFiles
            accept="audio/flac,audio/wav,audio/x-wav,audio/x-flac,audio/aac,audio/aiff,audio/x-m4a"
            label={t("uploadTracksDescription")}
            nameForId="track-files"
            {...register("trackFiles")}
          />
        </FormComponent>
      </form>
    </FormProvider>
  );
};

export default BulkTrackUpload;
