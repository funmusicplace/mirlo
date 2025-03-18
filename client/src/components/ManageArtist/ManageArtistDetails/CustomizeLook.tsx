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
import ArtistSlugInput from "./ArtistSlugInput";
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
import SavingInput from "../AlbumFormComponents/SavingInput";
import { QUERY_KEY_ARTISTS } from "queries/queryKeys";
import DeleteArtist from "../DeleteArtist";
import ArtistLabels from "./ArtistLabels";
import { Toggle } from "components/common/Toggle";
import Box from "components/common/Box";

export interface ShareableTrackgroup {
  creatorId: number;
  slug: string;
}

const allColorsSet = (artist: Artist) => {
  return (
    artist.properties?.colors.primary &&
    artist.properties?.colors.secondary &&
    artist.properties?.colors.foreground &&
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
      <ArtistLabels />
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
                  <SavingInput
                    formKey="name"
                    url={`manage/artists/${artistId}`}
                    extraData={{}}
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
                  <SavingInput
                    formKey="bio"
                    rows={7}
                    url={`manage/artists/${artistId}`}
                    extraData={{}}
                  />
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
                    {!allColorsSet(artist) && (
                      <ChooseYourTheme artistId={artist.id} />
                    )}

                    {allColorsSet(artist) && <ArtistFormColors />}
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
      <DeleteArtist />
    </div>
  );
};

export default CustomizeLook;
