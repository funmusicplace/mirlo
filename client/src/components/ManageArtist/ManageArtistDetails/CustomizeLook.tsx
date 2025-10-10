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
import { useCreateArtistMutation, useUpdateArtistMutation } from "queries";
import { useAuthContext } from "state/AuthContext";
import styled from "@emotion/styled";
import ChooseYourTheme from "../ChooseYourTheme";
import { useQueryClient } from "@tanstack/react-query";
import SavingInput from "../ManageTrackGroup/AlbumFormComponents/SavingInput";
import { QUERY_KEY_ARTISTS } from "queries/queryKeys";
import DeleteArtist from "../DeleteArtist";
import { Toggle } from "components/common/Toggle";
import LabelConfirmation from "./LabelConfirmation";
import useManagedArtistQuery from "utils/useManagedArtistQuery";
import FeatureFlag from "components/common/FeatureFlag";
import PaymentSlider from "../ManageTrackGroup/AlbumFormComponents/PaymentSlider";
import { InputEl } from "components/common/Input";
import CustomNamesForTabs from "./CustomNamesForTabs";
import ThankYouMessageEditors from "./ThankYouMessageEditors";

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
  gap: 1rem;

  @media (max-width: ${bp.medium}px) {
    flex-direction: column;
    padding: 1rem !important;
  }
  @media (prefers-color-scheme: dark) {
    ${(props) => (!props.isOdd ? "background: rgba(125, 125, 125, 0.1);" : "")}
  }
`;

export type ArtistFormData = {
  name: string;
  bio: string;
  urlSlug: string;
  banner: File[];
  avatar: File[];
  activityPub: boolean;
  defaultPlatformFee: number;
  properties: {
    colors: {
      primary: string;
      secondary: string;
      background: string;
      foreground: string;
    };
    tileBackgroundImage?: boolean;
    titles?: {
      releases: string;
      merch: string;
      posts: string;
      support: string;
      roster: string;
      groupName: string;
    };
  };
};

const generateDefaults = (existing?: Artist) => ({
  name: existing?.name ?? "",
  bio: existing?.bio ?? "",
  urlSlug: existing?.urlSlug ?? "",
  activityPub: existing?.activityPub ?? false,
  defaultPlatformFee: existing?.defaultPlatformFee ?? 10,
  shortDescription: existing?.shortDescription ?? "",
  maxFreePlays: existing?.maxFreePlays,
  properties: {
    colors: {
      primary: "",
      secondary: "",
      background: "",
      foreground: "",
    },
    titles: {
      releases: "Releases",
      merch: "Merch",
      posts: "Posts",
      support: "Support",
      roster: "Roster",
    },
    ...existing?.properties,
  },
});

export const CustomizeLook: React.FC = () => {
  const { t } = useTranslation("translation", { keyPrefix: "artistForm" });
  const snackbar = useSnackbar();
  const { user } = useAuthContext();
  const userId = user?.id;
  const { data: artist, refetch: refetchArtist } = useManagedArtistQuery();

  const methods = useForm<ArtistFormData>({
    defaultValues: generateDefaults(artist),
  });

  const { handleSubmit, formState } = methods;

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
    (data: ArtistFormData) => {
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

        snackbar(t("updated"), {
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
                    url={`manage/artists/${artist.id}`}
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
                <FormComponent>
                  <label>{t("shortDescription")}</label>
                  <SavingInput
                    formKey="shortDescription"
                    maxLength={160}
                    url={`manage/artists/${artist.id}`}
                    extraData={{}}
                  />
                </FormComponent>
                <FormComponent>
                  <label>{t("bio")}</label>
                  <SavingInput
                    formKey="bio"
                    rows={7}
                    url={`manage/artists/${artist.id}`}
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
                  <FormComponent>
                    <label>{t("tileImage")}</label>
                    <InputEl
                      type="checkbox"
                      {...methods.register("properties.tileBackgroundImage")}
                    />
                    <small>{t("tileImageDescription")}</small>
                  </FormComponent>
                </div>
              </div>
            </ArtistFormSection>
            <ArtistFormSection>
              <FormComponent
                className={css`
                  width: 300px;
                `}
              >
                <label>{t("defaultPlatformFee")}</label>
                <PaymentSlider
                  url={`manage/artists/${artist.id}`}
                  keyName="defaultPlatformFee"
                  extraData={{
                    artistId: 0,
                  }}
                />
                <small>{t("defaultPlatformFeeDescription")}</small>
              </FormComponent>
              <FeatureFlag featureFlag="maxFreePlays">
                <FormComponent
                  className={css`
                    width: 300px;
                  `}
                >
                  <label>{t("maxFreePlays")}</label>
                  <SavingInput
                    type="number"
                    min={0}
                    step={1}
                    placeholder="0"
                    url={`manage/artists/${artist.id}`}
                    formKey="maxFreePlays"
                  />
                  <small>{t("maxFreePlaysDescription")}</small>
                </FormComponent>
              </FeatureFlag>
            </ArtistFormSection>
            <FeatureFlag featureFlag="activityPub">
              <ArtistFormSection
                className={css`
                  flex-direction: column;
                `}
              >
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
            </FeatureFlag>
            <CustomNamesForTabs />
            <ArtistFormSection isOdd>
              <ThankYouMessageEditors
                artist={artist}
                onArtistUpdated={refetchArtist}
              />
            </ArtistFormSection>
            <ArtistFormSection
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
      {!artist.isLabelProfile && <LabelConfirmation />}

      {!artist.isLabelProfile && <DeleteArtist />}
    </div>
  );
};

export default CustomizeLook;
