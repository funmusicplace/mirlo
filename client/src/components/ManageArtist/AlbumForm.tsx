import React from "react";

import { FormProvider, useForm } from "react-hook-form";
import Button from "../common/Button";
import { InputEl } from "../common/Input";
import { SelectEl } from "../common/Select";
import TextArea from "../common/TextArea";
import FormComponent from "components/common/FormComponent";
import { useSnackbar } from "state/SnackbarContext";
import { pick } from "lodash";
import api from "../../services/api";
import { useGlobalStateContext } from "state/GlobalState";
import useErrorHandler from "services/useErrorHandler";
import { useTranslation } from "react-i18next";
import useJobStatusCheck from "utils/useJobStatusCheck";
import UploadImage from "./UploadImage";
import { useNavigate } from "react-router-dom";

const AlbumForm: React.FC<{
  existing?: TrackGroup;
  reload: () => Promise<void> | void;
  artist: Artist;
  onClose?: () => void;
}> = ({ reload, artist, existing, onClose }) => {
  const {
    state: { user },
  } = useGlobalStateContext();
  const snackbar = useSnackbar();
  const errorHandler = useErrorHandler();
  const [isSaving, setIsSaving] = React.useState(false);
  const { t } = useTranslation("translation", { keyPrefix: "manageAlbum" });

  const methods = useForm<{
    published: boolean;
    title: string;
    type: TrackGroup["type"];
    minPrice: string;
    releaseDate: string;
    about: string;
    coverFile: File[];
  }>({
    defaultValues: {
      ...existing,
      releaseDate: existing?.releaseDate.split("T")[0],
      minPrice: `${existing?.minPrice ? existing.minPrice / 100 : ""}`,
    } ?? {
      published: false,
    },
  });
  const { register, handleSubmit, reset } = methods;
  const { uploadJobs, setUploadJobs } = useJobStatusCheck({ reload, reset });
  const navigate = useNavigate();
  const [newAlbumId, setNewAlbumId] = React.useState<number>();
  const existingId = existing?.id;
  const userId = user?.id;

  const doSave = React.useCallback(
    async (data: {
      title: string;
      published: boolean;
      type: TrackGroup["type"];
      minPrice: string;
      releaseDate: string;
      about: string;
      coverFile: File[];
    }) => {
      if (userId) {
        try {
          setIsSaving(true);
          let savedId = existingId;
          const sending = {
            ...pick(data, ["title", "private", "type", "about"]),
            minPrice: data.minPrice ? +data.minPrice * 100 : undefined,
            releaseDate: new Date(data.releaseDate).toISOString(),
          };

          if (existingId) {
            await api.put<Partial<TrackGroup>, TrackGroup>(
              `users/${userId}/trackGroups/${existingId}`,
              {
                ...sending,
                artistId: artist.id,
              }
            );
          } else {
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
            savedId = newGroup.trackGroup.id;
            setNewAlbumId(savedId);
          }
          // data cover is a string if the form hasn't been changed.
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
          snackbar(
            existingId ? t("trackGroupUpdated") : t("trackGroupCreated"),
            {
              type: "success",
            }
          );
          onClose?.();
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
      onClose,
      artist.id,
      setUploadJobs,
      errorHandler,
      reload,
    ]
  );
  const isDisabled = isSaving || (uploadJobs && uploadJobs.length > 0);

  React.useEffect(() => {
    if (uploadJobs && uploadJobs.length === 0 && newAlbumId) {
      navigate(`/manage/artists/${artist.id}/release/${newAlbumId}`);
      reload();
    }
  }, [artist.id, navigate, newAlbumId, reload, uploadJobs]);

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(doSave)}>
        <FormComponent>
          {t("title")}: <InputEl {...register("title")} />
        </FormComponent>
        <FormComponent
          style={{
            flexDirection: "column",
            display: "flex",
            alignItems: "flex-start",
          }}
        >
          {t("cover")}:
          <UploadImage
            formName="coverFile"
            existingCover={existing?.cover?.sizes?.[120]}
            updatedAt={existing?.updatedAt}
            isLoading={
              uploadJobs?.[0]?.jobStatus !== undefined &&
              uploadJobs?.[0]?.jobStatus !== "completed"
            }
          />
        </FormComponent>

        <FormComponent>
          {t("type")}:{" "}
          <SelectEl defaultValue="lp" {...register("type")}>
            <option value="lp">{t("lp")}</option>
            <option value="ep">{t("ep")}</option>
            <option value="single">{t("single")}</option>
            <option value="compilation">{t("compilation")}</option>
          </SelectEl>
        </FormComponent>

        <FormComponent>
          {t("releaseDate")}:{" "}
          <InputEl type="date" {...register("releaseDate")} required />
        </FormComponent>
        <FormComponent>
          {t("about")}: <TextArea {...register("about")} rows={7} />
        </FormComponent>
        <FormComponent>
          {t("price")}:
          <InputEl type="number" {...register("minPrice")} />
        </FormComponent>
        <Button type="submit" disabled={isDisabled} isLoading={isDisabled}>
          {existing
            ? existing.published
              ? t("update")
              : t("saveDraft")
            : t("submitAlbum")}
        </Button>
      </form>
    </FormProvider>
  );
};

export default AlbumForm;
