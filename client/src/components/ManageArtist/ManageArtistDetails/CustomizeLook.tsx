import { css } from "@emotion/css";
import styled from "@emotion/styled";
import { useQueryClient } from "@tanstack/react-query";
import { ArtistButton } from "components/Artist/ArtistButtons";
import FormComponent from "components/common/FormComponent";
import { InputEl } from "components/common/Input";
import { Toggle } from "components/common/Toggle";
import { merge } from "lodash";
import { useCreateArtistMutation, useUpdateArtistMutation } from "queries";
import { QUERY_KEY_ARTISTS } from "queries/queryKeys";
import React from "react";
import { FormProvider, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import api from "services/api";
import { useAuthContext } from "state/AuthContext";
import { useSnackbar } from "state/SnackbarContext";
import useManagedArtistQuery from "utils/useManagedArtistQuery";

import { bp } from "../../../constants";
import ArtistSlugInput from "../../common/SlugInput";
import DeleteArtist from "../DeleteArtist";
import PaymentSlider from "../ManageTrackGroup/AlbumFormComponents/PaymentSlider";
import SavingInput from "../ManageTrackGroup/AlbumFormComponents/SavingInput";
import UploadArtistImage from "../UploadArtistImage";

import ArtistFormColors from "./ArtistFormColors";
import CustomNamesForTabs from "./CustomNamesForTabs";
import LabelConfirmation from "./LabelConfirmation";
import ThankYouMessageEditors from "./ThankYouMessageEditors";

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
  background: File[];
  avatar: File[];
  activityPub: boolean;
  allowDirectMessages: boolean;
  defaultPlatformFee: number;
  properties: {
    colors: {
      button: string;
      buttonText: string;
      background: string;
      text: string;
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

const generateDefaults = (existing?: Artist) => {
  return {
    name: existing?.name ?? "",
    bio: existing?.bio ?? "",
    urlSlug: existing?.urlSlug ?? "",
    activityPub: existing?.activityPub ?? false,
    allowDirectMessages: existing?.allowDirectMessages ?? true,
    defaultPlatformFee: existing?.defaultPlatformFee ?? 10,
    shortDescription: existing?.shortDescription ?? "",
    maxFreePlays: existing?.maxFreePlays,
    properties: merge(
      {
        colors: {
          button: "",
          buttonText: "",
          background: "",
          text: "",
        },
        titles: {
          releases: "Releases",
          merch: "Merch",
          posts: "Posts",
          support: "Support",
          roster: "Roster",
        },
      },
      existing?.properties ?? {}
    ),
  };
};

export const CustomizeLook: React.FC = () => {
  const { t } = useTranslation("translation", { keyPrefix: "artistForm" });
  const snackbar = useSnackbar();
  const { user } = useAuthContext();
  const userId = user?.id;
  const { data: artist, refetch: refetchArtist } = useManagedArtistQuery();

  const methods = useForm<ArtistFormData>({
    defaultValues: generateDefaults(artist),
  });

  const { handleSubmit } = methods;

  const existingId = artist?.id;

  React.useEffect(() => {
    if (existingId) {
      const defaults = generateDefaults(artist);
      methods.reset(defaults);
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
    async (data: ArtistFormData) => {
      if (!userId) return;

      const sending = {
        urlSlug: data.urlSlug?.toLowerCase(),
        activityPub: data.activityPub,
        allowDirectMessages: data.allowDirectMessages,
        properties: data.properties,
      };

      if (existingId) {
        await updateArtist(
          { userId, artistId: existingId, body: sending },
          { onSuccess, onError }
        );
      } else {
        await createArtist({ userId, body: sending }, { onSuccess, onError });
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
  const allowDirectMessages = methods.watch("allowDirectMessages");

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
                  <label htmlFor="input-name">{t("displayName")} </label>
                  <SavingInput
                    formKey="name"
                    id="input-name"
                    url={`manage/artists/${artist.id}`}
                    extraData={{}}
                  />
                </FormComponent>
                <FormComponent
                  className={css`
                    width: 100%;
                  `}
                >
                  <label htmlFor="input-slug">{t("urlSlug")} </label>
                  <ArtistSlugInput
                    currentArtistId={existingId}
                    id="input-slug"
                    type="artist"
                  />
                </FormComponent>
                <FormComponent>
                  <label htmlFor="input-description">
                    {t("shortDescription")}
                  </label>
                  <SavingInput
                    formKey="shortDescription"
                    id="input-description"
                    maxLength={160}
                    url={`manage/artists/${artist.id}`}
                    extraData={{}}
                  />
                </FormComponent>
                <FormComponent>
                  <label htmlFor="textarea-bio">{t("bio")}</label>
                  <SavingInput
                    formKey="bio"
                    id="textarea-bio"
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
                    <ArtistFormColors />
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
                      imageType="background"
                      height="auto"
                      width="100%"
                      maxDimensions="2500x2500"
                      maxSize="15mb"
                    />
                  </FormComponent>
                  <FormComponent>
                    <label htmlFor="input-tile-background-image">
                      {t("tileImage")}
                    </label>
                    <InputEl
                      aria-describedby="hint-tile-background-image"
                      id="input-tile-background-image"
                      type="checkbox"
                      {...methods.register("properties.tileBackgroundImage")}
                    />
                    <small id="input-tile-background-image">
                      {t("tileImageDescription")}
                    </small>
                  </FormComponent>
                </div>
              </div>
            </ArtistFormSection>
            <ArtistFormSection className="flex-col">
              <FormComponent
                className={css`
                  width: 500px;
                `}
              >
                <PaymentSlider
                  label={t("defaultPlatformFee")}
                  url={`manage/artists/${artist.id}`}
                  ariaDescribedBy="hint-default-platform-fee"
                  keyName="defaultPlatformFee"
                  extraData={{
                    artistId: 0,
                  }}
                />
                <small id="hint-default-platform-fee">
                  {t("defaultPlatformFeeDescription")}
                </small>
                <ApplyPlatformFeeButton artistId={artist.id} />
              </FormComponent>
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
                  placeholder=""
                  url={`manage/artists/${artist.id}`}
                  formKey="maxFreePlays"
                />
                <small>{t("maxFreePlaysDescription")}</small>
              </FormComponent>
            </ArtistFormSection>
            <ArtistFormSection
              className={css`
                flex-direction: column;
              `}
            >
              <FormComponent>
                <Toggle
                  ariaDescribedBy="hint-enable-activity-pub"
                  label={t("enableActivityPub")}
                  toggled={activityPub}
                  onClick={() => {
                    methods.setValue("activityPub", !activityPub);
                  }}
                />
                <small id="hint-enable-activity-pub">
                  {t("makeSearchable")}
                </small>
              </FormComponent>
              <FormComponent>
                <Toggle
                  ariaDescribedBy="hint-allow-direct-messages"
                  label={t("allowDirectMessages")}
                  toggled={allowDirectMessages}
                  onClick={() => {
                    methods.setValue(
                      "allowDirectMessages",
                      !allowDirectMessages
                    );
                  }}
                />
                <small id="hint-allow-direct-messages">
                  {t("allowDirectMessagesDescription")}
                </small>
              </FormComponent>
            </ArtistFormSection>
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
              <ArtistButton
                type="submit"
                disabled={isPending}
                isLoading={isPending}
              >
                {t("saveArtist")}
              </ArtistButton>
            </ArtistFormSection>
          </div>
        </form>
      </FormProvider>
      {!artist.isLabelProfile && <LabelConfirmation />}

      {!artist.isLabelProfile && <DeleteArtist />}
    </div>
  );
};

const ApplyPlatformFeeButton: React.FC<{ artistId: number }> = ({
  artistId,
}) => {
  const { t } = useTranslation("translation", { keyPrefix: "artistForm" });
  const snackbar = useSnackbar();
  const [isPending, setIsPending] = React.useState(false);

  const onClick = React.useCallback(async () => {
    if (!window.confirm(t("applyPlatformFeeConfirm") ?? "")) {
      return;
    }
    try {
      setIsPending(true);
      await api.post<unknown, unknown>(
        `manage/artists/${artistId}/applyPlatformFee`,
        {}
      );
      snackbar(t("applyPlatformFeeSuccess"), { type: "success" });
    } catch (e) {
      console.error(e);
      snackbar(t("applyPlatformFeeError"), { type: "warning" });
    } finally {
      setIsPending(false);
    }
  }, [artistId, snackbar, t]);

  return (
    <ArtistButton
      type="button"
      variant="dashed"
      onClick={onClick}
      disabled={isPending}
      isLoading={isPending}
      className={css`
        margin-top: 0.5rem;
      `}
    >
      {t("applyPlatformFeeToAll")}
    </ArtistButton>
  );
};

export default CustomizeLook;
