import React from "react";
import { css } from "@emotion/css";
import { FormProvider, useForm } from "react-hook-form";
import Button from "../common/Button";

import { useSnackbar } from "state/SnackbarContext";
import { pick } from "lodash";
import api from "../../services/api";
import { useGlobalStateContext } from "state/GlobalState";
import useErrorHandler from "services/useErrorHandler";
import { useTranslation } from "react-i18next";
import useJobStatusCheck from "utils/useJobStatusCheck";
import { useNavigate } from "react-router-dom";
import AlbumFormContent from "./AlbumFormComponents/AlbumFormContent";
import { FormData } from "./AlbumForm";

const NewAlbumForm: React.FC<{
  reload: () => Promise<void> | void;
  artist: Artist;
}> = ({ reload, artist }) => {
  const {
    state: { user },
  } = useGlobalStateContext();
  const snackbar = useSnackbar();
  const errorHandler = useErrorHandler();
  const [isSaving, setIsSaving] = React.useState(false);
  const { t } = useTranslation("translation", { keyPrefix: "manageAlbum" });

  const defaultValues = {};

  const methods = useForm<FormData>({
    defaultValues: defaultValues ?? {
      published: false,
    },
  });
  const { handleSubmit, reset } = methods;
  const { uploadJobs, setUploadJobs } = useJobStatusCheck({ reload, reset });
  const navigate = useNavigate();
  const [newAlbumId, setNewAlbumId] = React.useState<number>();
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

          const newGroup = await api.post<
            {
              title?: string;
              artistId: number;
              cover?: File[];
              minPrice?: number;
            },
            { trackGroup: { id: number } }
          >(`users/${userId}/trackGroups`, {
            ...sending,
            artistId: artist.id,
          });
          const savedId = newGroup.trackGroup.id;

          if (
            savedId &&
            data.coverFile[0] &&
            typeof data.coverFile[0] !== "string"
          ) {
            const jobInfo = await api.uploadFile(
              `users/${userId}/trackGroups/${savedId}/cover`,
              data.coverFile
            );
            setUploadJobs([
              { jobId: jobInfo.result.jobId, jobStatus: "waiting" },
            ]);
          }
          snackbar(t("trackGroupCreated"), {
            type: "success",
          });
          setNewAlbumId(savedId);
        } catch (e) {
          errorHandler(e);
        } finally {
          setIsSaving(false);
          await reload();
        }
      }
    },
    [t, userId, snackbar, artist.id, setUploadJobs, errorHandler, reload]
  );
  const isDisabled = isSaving || (uploadJobs && uploadJobs.length > 0);

  React.useEffect(() => {
    if (uploadJobs && uploadJobs.length === 0 && newAlbumId) {
      navigate(`/manage/artists/${artist.id}/release/${newAlbumId}`);
      reload();
    }
  }, [artist.id, navigate, newAlbumId, reload, uploadJobs]);

  return (
    <div
      className={css`
        background: var(--mi-light-background-color);
      `}
    >
      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(doSave)}>
          <AlbumFormContent
            isLoadingImage={
              uploadJobs?.[0]?.jobStatus !== undefined &&
              uploadJobs?.[0]?.jobStatus !== "completed"
            }
          />

          <Button type="submit" disabled={isDisabled} isLoading={isDisabled}>
            {t("submitAlbum")}
          </Button>
        </form>
      </FormProvider>
    </div>
  );
};

export default NewAlbumForm;
