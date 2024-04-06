import React from "react";
import { FormProvider, useForm } from "react-hook-form";
import Button from "../common/Button";

import { useSnackbar } from "state/SnackbarContext";
import { pick } from "lodash";
import api from "../../services/api";
import useErrorHandler from "services/useErrorHandler";
import { useTranslation } from "react-i18next";
import useJobStatusCheck from "utils/useJobStatusCheck";
import AlbumFormContent from "./AlbumFormComponents/AlbumFormContent";
import { useAuthContext } from "state/AuthContext";

export interface FormData {
  published: boolean;
  title: string;
  type: TrackGroup["type"];
  minPrice: string;
  releaseDate: string;
  credits: string;
  about: string;
  coverFile: File[];
}

const AlbumForm: React.FC<{
  existing: TrackGroup;
  reload: () => Promise<void> | void;
  artist: Artist;
}> = ({ reload, artist, existing }) => {
  const { user } = useAuthContext();
  const snackbar = useSnackbar();
  const errorHandler = useErrorHandler();
  const [isSaving, setIsSaving] = React.useState(false);
  const { t } = useTranslation("translation", { keyPrefix: "manageAlbum" });

  const defaultValues = {
    ...existing,
    releaseDate: existing?.releaseDate.split("T")[0],
    minPrice: `${
      existing?.minPrice !== undefined ? existing.minPrice / 100 : ""
    }`,
  };

  const methods = useForm<FormData>({
    defaultValues,
  });
  const { handleSubmit, reset } = methods;
  const { uploadJobs, setUploadJobs } = useJobStatusCheck({ reload, reset });
  const existingId = existing?.id;
  const userId = user?.id;

  const doSave = React.useCallback(
    async (data: FormData) => {
      if (userId) {
        try {
          setIsSaving(true);
          const sending = {
            ...pick(data, ["title", "private", "type", "about", "credits"]),
            minPrice: data.minPrice ? +data.minPrice * 100 : undefined,
            releaseDate: new Date(data.releaseDate).toISOString(),
          };

          await api.put<Partial<TrackGroup>, TrackGroup>(
            `users/${userId}/trackGroups/${existingId}`,
            {
              ...sending,
              artistId: artist.id,
            },
          );

          if (
            existingId &&
            data.coverFile?.[0] &&
            typeof data.coverFile?.[0] !== "string"
          ) {
            const jobInfo = await api.uploadFile(
              `users/${userId}/trackGroups/${existingId}/cover`,
              data.coverFile,
            );
            setUploadJobs([
              { jobId: jobInfo.result.jobId, jobStatus: "waiting" },
            ]);
          }
          snackbar(t("trackGroupUpdated"), {
            type: "success",
          });
        } catch (e) {
          errorHandler(e);
        } finally {
          setIsSaving(false);
          await reload();
        }
      }
    },
    [
      t,
      userId,
      existingId,
      snackbar,
      artist.id,
      setUploadJobs,
      errorHandler,
      reload,
    ],
  );
  const isDisabled = isSaving || (uploadJobs && uploadJobs.length > 0);

  return (
    <div>
      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(doSave)}>
          <AlbumFormContent
            isLoadingImage={
              uploadJobs?.[0]?.jobStatus !== undefined &&
              uploadJobs?.[0]?.jobStatus !== "completed"
            }
            existingObject={existing}
            existingFileCover={existing.cover?.sizes?.[120]}
          />

          <Button
            variant="big"
            type="submit"
            disabled={isDisabled}
            isLoading={isDisabled}
          >
            {existing.published ? t("update") : t("saveDraft")}
          </Button>
        </form>
      </FormProvider>
    </div>
  );
};

export default AlbumForm;
