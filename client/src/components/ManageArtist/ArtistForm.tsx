import React from "react";
import Modal from "components/common/Modal";
import Button from "../common/Button";
import { FormProvider, useForm } from "react-hook-form";
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
import ColorInput from "./ColorInput";
import { useArtistContext } from "state/ArtistContext";

export interface ShareableTrackgroup {
  creatorId: number;
  slug: string;
}

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
  const defaultValues = {
    name: "",
    bio: "",
    urlSlug: "",
    ...existing,
    properties: {
      colors: {
        primary: "",
        secondary: "",
        background: "",
        foreground: "",
      },
      ...existing?.properties,
    },
  };
  const methods = useForm<{
    name: string;
    bio: string;
    urlSlug: string;
    properties: {
      colors: {
        primary: string;
        secondary: string;
        background: string;
        foreground: string;
      };
    };
  }>({
    defaultValues,
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = methods;

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
    async (data: Partial<Artist>) => {
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

          await reload();
          await refresh();
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
    [userId, existingId, reload, refresh, snackbar, t, onClose]
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="small"
      title={existing ? "Edit artist" : "Create an artist"}
    >
      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(soSave)}>
          {existing && (
            <UploadArtistImage
              existing={existing}
              reload={reload}
              imageType="banner"
              height="125px"
              width="100%"
              maxDimensions="2500x500"
            />
          )}

          {/* {existing && (
          <UploadArtistImage
            existing={existing}
            reload={reload}
            imageType="avatar"
            height="120px"
            width="120px"
            maxDimensions="1500x1500"
          />
        )} */}

          <div
            className={css`
              margin-top: 1rem;
            `}
          >
            <h3>{existing ? existing.name : t("newArtist")}</h3>
            <FormComponent>
              {t("displayName")}:{" "}
              <InputEl {...register("name", { required: true })} />
            </FormComponent>
            {existing && (
              <>
                <ColorInput
                  name="properties.colors.primary"
                  title={t("primaryColor")}
                />
                <ColorInput
                  name="properties.colors.secondary"
                  title={t("secondaryColor")}
                />
                <ColorInput
                  name="properties.colors.background"
                  title={t("backgroundColor")}
                />
                <ColorInput
                  name="properties.colors.foreground"
                  title={t("foregroundColor")}
                />
              </>
            )}

            <FormComponent>
              {t("urlSlug")}:{" "}
              <InputEl
                {...register("urlSlug", {
                  validate: { unique: validation },
                  disabled: !!existing,
                })}
              />
              <small>Must be unique</small>
              {errors.urlSlug && (
                <small className="error">
                  {errors.urlSlug.type === "unique" &&
                    " This needs to be unique, try something else"}
                </small>
              )}
            </FormComponent>
            <FormComponent>
              {t("bio")}:
              <TextArea {...register("bio")} />
            </FormComponent>
            {/* <FormComponent>
            Email: <InputEl type="email" {...register("email")} />
          </FormComponent> */}

            <Button type="submit" disabled={isSaving} isLoading={isSaving}>
              {existing ? t("saveArtist") : t("createArtist")}
            </Button>
          </div>
        </form>
      </FormProvider>
    </Modal>
  );
};

export default ArtistForm;
