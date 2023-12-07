import React from "react";
import Modal from "components/common/Modal";
import Button from "../common/Button";
import { FormProvider, useForm } from "react-hook-form";
import { bp } from "../../constants";
import api from "services/api";
import { InputEl } from "../common/Input";
import FormComponent from "components/common/FormComponent";
import TextArea from "components/common/TextArea";
import { css } from "@emotion/css";
import { useSnackbar } from "state/SnackbarContext";
import { pick } from "lodash";
import { useGlobalStateContext } from "state/GlobalState";
import UploadArtistImage from "./UploadArtistImage";
import { useTranslation } from "react-i18next";
import { useArtistContext } from "state/ArtistContext";
import useJobStatusCheck from "utils/useJobStatusCheck";
import ArtistFormColors from "./ArtistFormColors";

export interface ShareableTrackgroup {
  creatorId: number;
  slug: string;
}

type FormData = {
  name: string;
  bio: string;
  urlSlug: string;
  banner: File[];
  avatar: File[];
  properties: {
    colors: {
      primary: string;
      secondary: string;
      background: string;
      foreground: string;
    };
  };
};

const generateDefaults = (existing?: Artist) => ({
  name: existing?.name ?? "",
  bio: existing?.bio ?? "",
  urlSlug: existing?.urlSlug ?? "",
  properties: {
    colors: {
      primary: "",
      secondary: "",
      background: "",
      foreground: "",
    },
    ...existing?.properties,
  },
});

export const ArtistForm: React.FC<{
  existing?: Artist;
  open: boolean;
  onClose: () => void;
  reload: () => Promise<void>;
}> = ({ open, onClose, reload, existing }) => {
  const { t } = useTranslation("translation", { keyPrefix: "artistForm" });
  const { refresh } = useArtistContext();
  const snackbar = useSnackbar();
  const { state } = useGlobalStateContext();
  const [isSaving, setIsSaving] = React.useState(false);

  const methods = useForm<FormData>({
    defaultValues: generateDefaults(existing),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = methods;

  const resetWrapper = React.useCallback(() => {
    reset(generateDefaults(existing));
  }, [existing, reset]);

  const { uploadJobs: uploadBannerJobs, setUploadJobs: setUploadBanner } =
    useJobStatusCheck({ reload, reset: resetWrapper });
  const { uploadJobs: uploadAvatarJobs, setUploadJobs: setUploadAvatar } =
    useJobStatusCheck({
      reload,
      reset: resetWrapper,
    });

  const validation = React.useCallback(
    async (value: string) => {
      if (state.user) {
        try {
          const response = await api.get<{ exists: boolean }>(
            `users/${
              state.user.id
            }/testExistence?urlSlug=${value.toLowerCase()}`
          );
          return !response.result.exists;
        } catch (e) {
          return true;
        }
      }
      return true;
    },
    [state.user]
  );

  const existingId = existing?.id;

  const userId = state.user?.id;

  const soSave = React.useCallback(
    async (data: FormData) => {
      if (userId) {
        try {
          setIsSaving(true);
          const sending = pick(data, [
            "bio",
            "name",
            "urlSlug",
            "properties.colors",
          ]);
          sending.urlSlug = sending.urlSlug?.toLowerCase();
          if (existingId) {
            await api.put(`users/${userId}/artists/${existingId}`, {
              ...sending,
            });
          } else {
            await api.post(`users/${userId}/artists`, {
              ...sending,
            });
          }

          const jobIds = [];
          if (
            existingId &&
            data.banner[0] &&
            typeof data.banner[0] !== "string"
          ) {
            const jobInfo = await api.uploadFile(
              `users/${userId}/artists/${existingId}/banner`,
              data.banner
            );
            jobIds.push(jobInfo.result.jobId);

            setUploadBanner([
              { jobId: jobInfo.result.jobId, jobStatus: "waiting" },
            ]);
          }

          if (
            existingId &&
            data.avatar[0] &&
            typeof data.avatar[0] !== "string"
          ) {
            const jobInfo = await api.uploadFile(
              `users/${userId}/artists/${existingId}/avatar`,
              data.avatar
            );

            setUploadAvatar([
              { jobId: jobInfo.result.jobId, jobStatus: "waiting" },
            ]);
          }
          await reload();
          await refresh?.();
          if (!existingId) {
            onClose();
          }
          snackbar(t("updatedArtist"), { type: "success" });
        } catch (e) {
          console.error(e);
          snackbar("Something went wrong with the API", { type: "warning" });
        } finally {
          setIsSaving(false);
        }
      }
    },
    [
      userId,
      existingId,
      reload,
      refresh,
      snackbar,
      t,
      setUploadBanner,
      setUploadAvatar,
      onClose,
    ]
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={existing ? "Edit artist" : "Create an artist"}
    >
      <div
        className={css`
          margin-top: 0.5rem;
          label {
            display: block;
            font-size: 1.4rem;
            margin-bottom: 0.7rem;
          }
          @media (max-width: ${bp.medium}px) {
            label {
              font-size: 1.3rem;
            }
          }
        `}
      >
        <FormProvider {...methods}>
          <form onSubmit={handleSubmit(soSave)}>
            <div
              className={css`
                display: flex;
              `}
            >
              <div
                className={css`
                  flex: 50%;
                  @media (max-width: ${bp.medium}px) {
                    flex-direction: column;
                  }
                `}
              >
                {existing && (
                  <UploadArtistImage
                    existing={existing}
                    reload={reload}
                    imageType="banner"
                    height="auto"
                    width="100%"
                    maxDimensions="2500x2500"
                    isLoading={
                      uploadBannerJobs?.[0]?.jobStatus !== undefined &&
                      uploadBannerJobs?.[0]?.jobStatus !== "completed"
                    }
                  />
                )}
              </div>

              <div
                className={css`
                  flex: 50%;
                  margin-left: 1rem;
                `}
              >
                {existing && (
                  <UploadArtistImage
                    existing={existing}
                    reload={reload}
                    imageType="avatar"
                    height="auto"
                    width="100%"
                    maxDimensions="1500x1500"
                    isLoading={
                      uploadAvatarJobs?.[0]?.jobStatus !== undefined &&
                      uploadAvatarJobs?.[0]?.jobStatus !== "completed"
                    }
                  />
                )}
              </div>
            </div>

            <div>
              <FormComponent>
                <label>{t("displayName")} </label>
                <InputEl {...register("name", { required: true })} />
              </FormComponent>

              <FormComponent>{existing && <ArtistFormColors />}</FormComponent>

              <FormComponent>
                <label>{t("urlSlug")} </label>
                <InputEl
                  {...register("urlSlug", {
                    validate: { unique: validation },
                    disabled: !!existing,
                  })}
                  className={css`
                    margin-bottom: 0.5rem;
                  `}
                />
                <small>Must be unique</small>
                {errors.urlSlug && (
                  <small className="error">
                    {errors.urlSlug.type === "unique" &&
                      "This needs to be unique, try something else"}
                  </small>
                )}
              </FormComponent>

              <FormComponent>
                <label>{t("bio")}</label>
                <TextArea {...register("bio")} rows={7} />
              </FormComponent>

              <Button type="submit" disabled={isSaving} isLoading={isSaving}>
                {existing ? t("saveArtist") : t("createArtist")}
              </Button>
            </div>
          </form>
        </FormProvider>
      </div>
    </Modal>
  );
};

export default ArtistForm;
