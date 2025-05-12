import React from "react";
import Button from "../../common/Button";
import { FormProvider, useForm } from "react-hook-form";
import { bp } from "../../../constants";
import FormComponent from "components/common/FormComponent";
import { css } from "@emotion/css";
import { useSnackbar } from "state/SnackbarContext";
import UploadArtistImage from "../UploadArtistImage";
import { useTranslation } from "react-i18next";
import ArtistFormColors from "./ArtistFormColors";
import ArtistSlugInput from "../../common/SlugInput";
import {
  queryManagedArtist,
  useCreateArtistMutation,
  useUpdateArtistMutation,
} from "queries";
import { useAuthContext } from "state/AuthContext";
import styled from "@emotion/styled";
import ChooseYourTheme from "../ChooseYourTheme";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import SavingInput from "../ManageTrackGroup/AlbumFormComponents/SavingInput";
import { QUERY_KEY_ARTISTS } from "queries/queryKeys";
import DeleteArtist from "../DeleteArtist";
import { Toggle } from "components/common/Toggle";
import Box from "components/common/Box";
import LabelConfirmation from "./LabelConfirmation";
import FeatureFlag from "components/common/FeatureFlag";

export interface ShareableTrackgroup {
  creatorId: number;
  slug: string;
}

const someColorsSet = (artist: Artist) => {
  return (
    artist.properties?.colors.primary ||
    artist.properties?.colors.secondary ||
    artist.properties?.colors.foreground ||
    artist.properties?.colors.background
  );
};

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
  activityPub: boolean;
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
  activityPub: existing?.activityPub ?? false,
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

export const CustomizeLook: React.FC = () => {
  const { t } = useTranslation("translation", { keyPrefix: "artistForm" });
  const snackbar = useSnackbar();
  const { user } = useAuthContext();
  const userId = user?.id;
  const { artistId } = useParams();
  const { data: artist } = useQuery(queryManagedArtist(Number(artistId)));

  const methods = useForm<FormData>({
    defaultValues: generateDefaults(artist),
  });

  const { handleSubmit } = methods;

  const existingId = artist?.id;

  React.useEffect(() => {
    if (existingId) {
      methods.reset(generateDefaults(artist));
    }
  }, [artist, existingId, methods]);

  const { mutate: createArtist, isPending: isCreatePending } =
    useCreateArtistMutation();
  const { mutate: updateArtist, isPending: isUpdatePending } =
    useUpdateArtistMutation();
  const isPending = isCreatePending || isUpdatePending;
  const client = useQueryClient();

  const onSuccess = React.useCallback(() => {
    snackbar(t("updatedArtist"), { type: "success" });
  }, [existingId, t, snackbar]);

  const onError = React.useCallback(() => {
    snackbar("Something went wrong with the API", { type: "warning" });
  }, [snackbar]);

  const onValidSubmit = React.useCallback(
    (data: FormData) => {
      if (!userId) return;

      const sending = {
        urlSlug: data.urlSlug?.toLowerCase(),
        activityPub: data.activityPub,
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

      const timeout = setTimeout(() => {
        client.invalidateQueries({
          predicate: (query) => {
            const shouldInvalidate = query.queryKey.find((obj) => {
              if (typeof obj === "string") {
                return obj
                  .toLowerCase()
                  .includes(QUERY_KEY_ARTISTS.toLowerCase());
              }
              return false;
            });

            return !!shouldInvalidate;
          },
        });

        snackbar(t("merchUpdated"), {
          type: "success",
        });
      }, 2000);
      return () => {
        clearTimeout(timeout);
      };
    },
    [userId, existingId, onSuccess, updateArtist, createArtist, onError]
  );

  const activityPub = methods.watch("activityPub");

  if (!artist) {
    return null;
  }

  return (
    <div>
      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(onValidSubmit)}>
          <div>
            <ArtistFormSection
              className={css`
                display: flex;
              `}
            >
              <div
                className={css`
                  max-width: 15rem;
                  margin-right: 2rem;
                `}
              >
                <FormComponent>
                  <UploadArtistImage
                    existing={artist}
                    imageTypeDescription={t("yourAvatar")}
                    imageType="avatar"
                    height="auto"
                    width="100%"
                    maxDimensions="1500x1500"
                    maxSize="15mb"
                  />
                </FormComponent>
              </div>

              <div
                className={css`
                  flex-grow: 1;
                `}
              >
                <FormComponent>
                  <label>{t("displayName")} </label>
                  <SavingInput
                    formKey="name"
                    url={`manage/artists/${artistId}`}
                    extraData={{}}
                  />
                </FormComponent>
                <FormComponent
                  className={css`
                    width: 100%;
                  `}
                >
                  <label>{t("urlSlug")} </label>
                  <ArtistSlugInput currentArtistId={existingId} type="artist" />
                </FormComponent>
                <div className={css``}>
                  <FormComponent>
                    <label>{t("bio")}</label>
                    <SavingInput
                      formKey="bio"
                      rows={7}
                      url={`manage/artists/${artistId}`}
                      extraData={{}}
                    />
                  </FormComponent>
                </div>
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
                    {!someColorsSet(artist) && (
                      <ChooseYourTheme artistId={artist.id} />
                    )}

                    {someColorsSet(artist) && <ArtistFormColors />}
                  </FormComponent>
                </div>
                <div
                  className={css`
                    flex: 55%;
                    @media (max-width: ${bp.medium}px) {
                      flex-direction: column;
                      padding-bottom: 2rem !important;
                    }
                  `}
                >
                  <FormComponent>
                    <label>{t("backgroundImageLabel")}</label>
                    <UploadArtistImage
                      existing={artist}
                      imageTypeDescription={t("backgroundImageDescription")}
                      imageType="banner"
                      height="auto"
                      width="100%"
                      maxDimensions="2500x2500"
                      maxSize="15mb"
                    />
                  </FormComponent>
                </div>
              </div>
            </ArtistFormSection>

            <ArtistFormSection
              className={css`
                flex-direction: column;
              `}
            >
              <Box variant="warning">{t("warningFeature")}</Box>
              <FormComponent>
                <Toggle
                  label={t("enableActivityPub")}
                  toggled={activityPub}
                  onClick={() => {
                    methods.setValue("activityPub", !activityPub);
                  }}
                />
                <small>{t("makeSearchable")}</small>
              </FormComponent>
            </ArtistFormSection>
            <ArtistFormSection
              isOdd
              className={css`
                margin-bottom: 0 !important;
              `}
            >
              <Button type="submit" disabled={isPending} isLoading={isPending}>
                {t("saveArtist")}
              </Button>
            </ArtistFormSection>
          </div>
        </form>
      </FormProvider>
      <FeatureFlag featureFlag="label">
        <LabelConfirmation />
      </FeatureFlag>

      <DeleteArtist />
    </div>
  );
};

export default CustomizeLook;
