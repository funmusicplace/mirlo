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
import styled from "@emotion/styled";

export interface ShareableTrackgroup {
  creatorId: number;
  slug: string;
}

export const ArtistFormSection = styled.div<{ isOdd?: boolean }>`
  display: flex;
  padding: 2rem !important;
  margin-bottom: 1rem;
  ${(props) =>
    !props.isOdd ? "background: var(--mi-lighten-background-color);" : ""}
  gap: 0;

  @media (max-width: ${bp.medium}px) {
    flex-direction: column;
    padding: 1rem !important;
  }
  @media (prefers-color-scheme: dark) {
    ${(props) => (!props.isOdd ? "background: rgba(125, 125, 125, 0.1);" : "")}
  }
`;

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

  const { mutate: createArtist, isPending: isCreatePending } =
    useCreateArtistMutation();
  const { mutate: updateArtist, isPending: isUpdatePending } =
    useUpdateArtistMutation();
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

  const onValidSubmit = React.useCallback(
    (data: FormData) => {
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
        createArtist({ userId, body: sending }, { onSuccess, onError });
      }
    },
    [userId, existingId, onSuccess, updateArtist, createArtist, onError]
  );

  return (
    <Modal
      noPadding
      open={open}
      onClose={onClose}
      title={existing ? "Edit artist" : "Create an artist"}
      className={css`
        div:nth-child(1) {
          margin-bottom: 0;
        }
      `}
    >
      <div>
        <FormProvider {...methods}>
          <form onSubmit={handleSubmit(onValidSubmit)}>
            <div>
              <ArtistFormSection
                className={css`
                  display: grid !important;
                  grid-template-columns: repeat(5, 1fr);
                  grid-template-rows: repeat(3, 1fr);
                  grid-gap: 5% !important;
                  @media (max-width: ${bp.medium}px) {
                    grid-template-rows: repeat(10, 0.25fr);
                    row-gap: 0 !important;
                  }
                `}
              >
                <div
                  className={css`
                    grid-column: 1 / 3;
                    grid-row: 1 / 5;
                    @media (max-width: ${bp.medium}px) {
                      grid-column: 1 / 3;
                      grid-row: 1 / 5;
                      input {
                        display: none;
                      }
                    }
                  `}
                >
                  <FormComponent>
                    {existing && (
                      <UploadArtistImage
                        existing={existing}
                        imageTypeDescription="your avatar"
                        imageType="avatar"
                        height="auto"
                        width="100%"
                        maxDimensions="1500x1500"
                      />
                    )}
                  </FormComponent>
                </div>

                <div
                  className={css`
                    padding-bottom: 1rem;
                    grid-column: 3 / 6;
                    grid-row: 1;
                    @media (max-width: ${bp.medium}px) {
                      grid-row: 2;
                    }
                  `}
                >
                  <FormComponent>
                    <label>{t("displayName")} </label>
                    <InputEl
                      {...register("name", { required: true })}
                      className={css`
                        font-size: 1.5rem !important;
                        @media (max-width: ${bp.medium}px) {
                          font-size: 1rem !important;
                        }
                      `}
                    />
                  </FormComponent>
                </div>

                <div
                  className={css`
                    grid-column: 3 / 6;
                    grid-row: 2 / 5;
                    @media (max-width: ${bp.medium}px) {
                      grid-column: 1 / 6;
                      grid-row: 6 / 11;
                    }
                  `}
                >
                  <FormComponent>
                    <label>{t("bio")}</label>
                    <TextArea {...register("bio")} rows={7} />
                  </FormComponent>
                </div>
              </ArtistFormSection>
              <ArtistFormSection isOdd>
                <div
                  className={css`
                    display: flex;
                    width: 100%;
                    margin-bottom: 1rem;
                    gap: 5%;
                    @media (max-width: ${bp.medium}px) {
                      flex-direction: column;
                    }
                  `}
                >
                  <div
                    className={css`
                      flex: 35%;
                      flex-direction: column;
                    `}
                  >
                    <FormComponent>
                      {existing && <ArtistFormColors />}
                    </FormComponent>
                  </div>
                  <div
                    className={css`
                      flex: 55%;
                      @media (max-width: ${bp.medium}px) {
                        flex-direction: column;
                      }
                    `}
                  >
                    <FormComponent>
                      <label>Background Image</label>
                      {existing && (
                        <UploadArtistImage
                          existing={existing}
                          imageTypeDescription="a background image"
                          imageType="banner"
                          height="auto"
                          width="100%"
                          maxDimensions="2500x2500"
                        />
                      )}
                    </FormComponent>
                  </div>
                </div>
              </ArtistFormSection>

              <ArtistFormSection>
                <FormComponent
                  className={css`
                    width: 100%;
                  `}
                >
                  <label>{t("urlSlug")} </label>
                  <ArtistSlugInput currentArtistId={existingId} />
                </FormComponent>
              </ArtistFormSection>

              <ArtistFormSection
                isOdd
                className={css`
                  margin-bottom: 0 !important;
                `}
              >
                <Button
                  type="submit"
                  variant="big"
                  disabled={isPending}
                  isLoading={isPending}
                >
                  {existing ? t("saveArtist") : t("createArtist")}
                </Button>
              </ArtistFormSection>
            </div>
          </form>
        </FormProvider>
      </div>
    </Modal>
  );
};

export default ArtistForm;
