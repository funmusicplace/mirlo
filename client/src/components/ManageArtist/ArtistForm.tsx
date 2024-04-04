import React from "react";
import Modal from "components/common/Modal";
import Button from "../common/Button";
import { FormProvider, useForm } from "react-hook-form";
import { bp } from "../../constants";
import { InputEl } from "../common/Input";
import FormComponent from "components/common/FormComponent";
import TextArea from "components/common/TextArea";
import { css } from "@emotion/css";
import { useSnackbar } from "state/SnackbarContext";
import UploadArtistImage from "./UploadArtistImage";
import { useTranslation } from "react-i18next";
import ArtistFormColors from "./ArtistFormColors";
import ArtistSlugInput from "./ArtistSlugInput";
import { useCreateArtistMutation, useUpdateArtistMutation } from "queries";
import { useAuthContext } from "state/AuthContext";

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
}> = ({ open, onClose, existing }) => {
  const { t } = useTranslation("translation", { keyPrefix: "artistForm" });
  const snackbar = useSnackbar();

  const methods = useForm<FormData>({
    defaultValues: generateDefaults(existing),
  });

  const { register, handleSubmit } = methods;

  const existingId = existing?.id;

  React.useEffect(() => {
    if (existingId) {
      methods.reset(generateDefaults(existing));
    }
  }, [existing, existingId, methods]);

  const { user } = useAuthContext();
  const userId = user?.id;

  const { mutate: createArtist, isPending: isCreatePending } = useCreateArtistMutation();
  const { mutate: updateArtist, isPending: isUpdatePending } = useUpdateArtistMutation();
  const isPending = isCreatePending || isUpdatePending;

  const onSuccess = React.useCallback(() => {
    if (!existingId) {
      onClose();
    }
    snackbar(t("updatedArtist"), { type: "success" });
  }, [existingId, onClose, t, snackbar]);

  const onError = React.useCallback(() => {
    snackbar("Something went wrong with the API", { type: "warning" });
  }, [snackbar]);

  const onValidSubmit = React.useCallback((data: FormData) => {
    if (!userId) return;

    const sending = {
      bio: data.bio,
      name: data.name,
      urlSlug: data.urlSlug?.toLowerCase(),
      properties: data.properties,
    };

    if (existingId) {
      updateArtist(
        { userId, artistId: existingId, body: sending },
        { onSuccess, onError }
      );
    } else {
      createArtist(
        { userId, body: sending },
        { onSuccess, onError }
      );
    }
  }, [userId, existingId, onSuccess, updateArtist, createArtist, onError]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={existing ? "Edit artist" : "Create an artist"}
    >
      <div
        className={css`
          margin-top: 0.5rem;
        `}
      >
        <FormProvider {...methods}>
          <form onSubmit={handleSubmit(onValidSubmit)}>
            <div
              className={css`
                display: flex;
                margin-bottom: 1rem;
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
                    imageType="banner"
                    height="auto"
                    width="100%"
                    maxDimensions="2500x2500"
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
                    imageType="avatar"
                    height="auto"
                    width="100%"
                    maxDimensions="1500x1500"
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
                <ArtistSlugInput currentArtistId={existingId} />
              </FormComponent>

              <FormComponent>
                <label>{t("bio")}</label>
                <TextArea {...register("bio")} rows={7} />
              </FormComponent>

              <Button type="submit" disabled={isPending} isLoading={isPending}>
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
