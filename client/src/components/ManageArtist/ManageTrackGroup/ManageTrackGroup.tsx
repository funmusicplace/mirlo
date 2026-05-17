import FormComponent from "components/common/FormComponent";
import { InputEl } from "components/common/Input";
import { RestoredLabel } from "components/common/RestoredFields";
import TextArea from "components/common/TextArea";
import { Trans, useTranslation } from "react-i18next";
import UploadArtistImage from "../UploadArtistImage";
import FundraisingGoal from "./AlbumFormComponents/FundraisingGoal";
import ManageTags from "./AlbumFormComponents/ManageTags";
import PreOrderSection from "./AlbumFormComponents/PreOrderSection";
import PriceAndSuch from "./AlbumFormComponents/PriceAndSuch";
import VisibilityRadio from "./AlbumFormComponents/VisibilityRadio";
import SchedulePublication from "./AlbumFormComponents/SchedulePublication";
import { css } from "@emotion/css";
import styled from "@emotion/styled";
import { useQuery } from "@tanstack/react-query";
import {
  ArtistButton,
  ArtistButtonLink,
} from "components/Artist/ArtistButtons";
import LoadingBlocks from "components/Artist/LoadingBlocks";
import FeatureFlag from "components/common/FeatureFlag";
import {
  queryArtist,
  queryManagedTrackGroup,
  useDeleteTrackGroupMutation,
} from "queries";
import React from "react";
import { FaEye, FaTrash } from "react-icons/fa";
import { MdOutlineDownloadForOffline } from "react-icons/md";
import { useNavigate, useParams } from "react-router-dom";
import { useSnackbar } from "state/SnackbarContext";
import PublishButton from "components/ManageArtist/PublishButton";
import {
  getArtistManageUrl,
  getReleaseUrl,
  isTrackGroupPublished,
} from "utils/artist";
import useShow from "utils/useShow";
import { bp } from "../../../constants";
import BackToArtistLink from "../BackToArtistLink";
import ManageSectionWrapper from "../ManageSectionWrapper";
import DownloadableContent from "../Merch/DownloadableContent";
import AlbumPaymentReceiver from "./AlbumFormComponents/AlbumPaymentReceiver";
import ManageTrackDefaults from "./AlbumFormComponents/ManageTrackDefaults";
import RecommendedTrackGroups from "./AlbumFormComponents/RecommendedTrackGroups";
import BulkTrackUpload from "./BulkTrackUpload";
import ManageTrackTable from "./ManageTrackTable";
import { ZipDropZone } from "./ZipDropZone";
import SaveDraftBar from "components/ManageArtist/ManageTrackGroup/AlbumFormComponents/SaveDraftBar";
import DraftRestoredBanner from "components/common/DraftRestoredBanner";
import { RestoredFieldsProvider } from "components/common/RestoredFields";
import { FormProvider, useForm } from "react-hook-form";
import { useFormPersist } from "utils/useFormPersist";

export interface TrackGroupFormData {
  title: string;
  urlSlug?: string;
  minPrice?: string;
  suggestedPrice?: string;
  isGettable?: boolean;
  isPublic?: boolean;
  platformPercent?: string;
  releaseDate?: string;
  publishedAt?: string;
  credits?: string;
  about?: string;
  coverFile?: File[];
  catalogNumber?: string;
  goalAmount?: string;
  isAllOrNothing?: boolean;
}

export const FormSection = styled.div`
  margin: 2rem 0;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--mi-tint-x-color);
`;

const buildDefaultValues = (trackGroup: TrackGroup): TrackGroupFormData => {
  const trackGroupIsGettable = trackGroup?.isGettable ?? false;
  return {
    ...trackGroup,
    releaseDate: trackGroup?.releaseDate?.split("T")[0] ?? "",
    catalogNumber: trackGroup?.catalogNumber ?? "",
    publishedAt: trackGroup?.publishedAt?.split("T")[0],
    platformPercent: `${trackGroup?.platformPercent ?? 7}`,
    isGettable: trackGroupIsGettable,
    minPrice: `${
      trackGroup?.minPrice !== undefined ? trackGroup.minPrice / 100 : ""
    }`,
    suggestedPrice:
      trackGroup?.suggestedPrice != null
        ? `${trackGroup.suggestedPrice / 100}`
        : "",
    goalAmount: `${
      trackGroup?.fundraiser?.goalAmount
        ? trackGroup.fundraiser.goalAmount / 100
        : ""
    }`,
    isAllOrNothing: trackGroup?.fundraiser?.isAllOrNothing ?? false,
  } as unknown as TrackGroupFormData;
};

const ManageTrackGroup: React.FC<{}> = () => {
  const { t } = useTranslation("translation", {
    keyPrefix: "manageAlbum",
  });
  const { t: manageArtistT } = useTranslation("translation", {
    keyPrefix: "manageArtist",
  });
  const snackbar = useSnackbar();
  const navigate = useNavigate();
  const headerShow = useShow();

  const { artistId: artistParamId, trackGroupId: trackGroupParamId } =
    useParams();

  const { data: artist, isPending: isLoading } = useQuery(
    queryArtist({ artistSlug: artistParamId ?? "" })
  );

  const {
    data: trackGroup,
    isPending: isLoadingTrackGroup,
    refetch,
  } = useQuery(queryManagedTrackGroup(Number(trackGroupParamId)));

  const { mutateAsync: deleteTrackGroup, isPending: isDeletingTrackGroup } =
    useDeleteTrackGroupMutation();

  const handleDeleteTrackGroup = React.useCallback(async () => {
    if (!trackGroup || !artist) {
      return;
    }

    const confirmed = window.confirm(
      manageArtistT("deleteTrackGroupConfirm") ?? ""
    );
    if (!confirmed) {
      return;
    }

    try {
      await deleteTrackGroup({
        trackGroupId: trackGroup.id,
      });
      snackbar(manageArtistT("albumDeleted"), { type: "success" });
      navigate(getArtistManageUrl(artist.id) + "/releases");
    } catch (error) {
      console.error(error);
      snackbar(manageArtistT("somethingWentWrong"), { type: "warning" });
    }
  }, [artist, deleteTrackGroup, manageArtistT, navigate, snackbar, trackGroup]);

  const methods = useForm<TrackGroupFormData>();
  const { register } = methods;

  React.useEffect(() => {
    if (!!trackGroup) {
      methods.reset(buildDefaultValues(trackGroup), {
        keepDirtyValues: true,
        keepDirty: true,
      });
    }
  }, [trackGroup]);

  const draftKey = trackGroup?.id ? `albumDraft-${trackGroup.id}` : null;
  const {
    hasRestoredDraft,
    restoredFields,
    clearDraft,
    discardDraft,
    dismissBanner,
  } = useFormPersist(draftKey, methods);

  const fieldLabelMap = React.useMemo<Record<string, string>>(
    () => ({
      title: t("title"),
      urlSlug: t("urlSlug"),
      releaseDate: t("releaseDate"),
      catalogNumber: t("catalogNumber"),
      about: t("about"),
      credits: t("credits"),
      minPrice: t("minimumPrice"),
      suggestedPrice: t("suggestedPrice"),
    }),
    [t]
  );
  const restoredLabels = restoredFields
    .map((f) => fieldLabelMap[f])
    .filter(Boolean);

  const urlSlug = methods.watch("urlSlug");
  const releaseDateValue = methods.watch("releaseDate");

  const hasReleaseDate = Boolean(releaseDateValue);

  if (!artist && isLoading) {
    return <LoadingBlocks />;
  } else if (!artist) {
    return null;
  } else if (!trackGroup && isLoadingTrackGroup) {
    return <LoadingBlocks />;
  } else if (!trackGroup) {
    return null;
  }

  return (
    <ManageSectionWrapper
      className={css`
        padding-top: 2rem !important;

        @media (max-width: ${bp.small}px) {
          padding-top: 1rem !important;
        }
      `}
    >
      <div className="flex flex-col items-start">
        <BackToArtistLink subPage="releases" />
        <h1 className="mt-4">{t(trackGroup ? "editAlbum" : "createAlbum")}</h1>
      </div>
      <AlbumPaymentReceiver />
      <FeatureFlag flag="zipUpload">
        {trackGroup && (
          <FormSection>
            <ZipDropZone
              existingTracksCount={trackGroup?.tracks?.length ?? 0}
              trackGroupId={trackGroup.id}
              artistId={artist.id}
              reload={refetch}
            />
          </FormSection>
        )}
      </FeatureFlag>
      <FormProvider {...methods}>
        <RestoredFieldsProvider fields={restoredFields}>
          {hasRestoredDraft && (
            <DraftRestoredBanner
              onDiscard={() => discardDraft(buildDefaultValues(trackGroup))}
              onKeep={dismissBanner}
              fieldLabels={restoredLabels}
            />
          )}
          {/* TODO: replace the z-1001 with a shared z-index design.
          1001 is just one above AutoComplete (z-1000) so the tags dropdown
          doesn't render over the sticky save bar when it opens. */}
          <div
            className={`sticky z-[1001] flex flex-wrap items-start gap-2 bg-(--mi-background-color) py-4 mb-4 border-b border-(--mi-tint-x-color) transition-[top] duration-300 ${headerShow === "down" ? "top-0" : "top-(--header-cover-sticky-height)"}`}
          >
            <SaveDraftBar
              existingObject={trackGroup}
              onSaveSuccess={() => {
                clearDraft();
                refetch();
              }}
            />
            {!isTrackGroupPublished(trackGroup) &&
              (trackGroup.tracks?.length > 0 || !!trackGroup.fundraiser) &&
              trackGroup.artist && (
                <ArtistButtonLink
                  to={getReleaseUrl(trackGroup.artist, trackGroup)}
                  startIcon={<FaEye />}
                  variant="dashed"
                >
                  {t("previewRelease")}
                </ArtistButtonLink>
              )}
            <div className="ml-auto flex flex-col items-end gap-1">
              <PublishButton
                trackGroup={trackGroup}
                reload={refetch}
                onSaveSuccess={clearDraft}
              />
              <SchedulePublication
                existingObject={trackGroup}
                reload={refetch}
              />
            </div>
          </div>
          <VisibilityRadio existingObject={trackGroup} />
          <PreOrderSection
            existingObject={trackGroup}
            reload={refetch}
            hasReleaseDate={hasReleaseDate}
          />
          <FormSection>
            <h2>{t("keyDetails")}</h2>
            <div className="md:grid md:grid-cols-2 gap-4">
              <FormComponent>
                <RestoredLabel htmlFor="input-title" field="title">
                  {t("title")}
                </RestoredLabel>
                <InputEl id="input-title" {...register("title")} />
              </FormComponent>
              <FormComponent>
                <RestoredLabel htmlFor="input-slug" field="urlSlug">
                  {t("urlSlug")}
                </RestoredLabel>
                <InputEl id="input-slug" {...register("urlSlug")} />
                {isTrackGroupPublished(trackGroup) && (
                  <small>
                    <span>
                      {t("fullUrlIs", {
                        currentUrlSlug: `${window.location.origin}/${trackGroup.artist.urlSlug}/release/${urlSlug}`,
                      })}
                      .{" "}
                    </span>
                    <span className="bg-(--mi-background-color) text-(--mi-warning-color)">
                      {t("urlSlugWarning")}
                    </span>
                  </small>
                )}
              </FormComponent>
            </div>
            <div
              className={css`
                @media screen and (min-width: ${bp.medium}px) {
                  display: flex;
                  gap: 1rem;

                  > div {
                    width: 33%;
                  }
                }
              `}
            >
              <FormComponent>
                <RestoredLabel htmlFor="input-release-date" field="releaseDate">
                  {t("releaseDate")}
                </RestoredLabel>
                <InputEl
                  aria-describedby="hint-release-date"
                  id="input-release-date"
                  type="date"
                  {...register("releaseDate")}
                />
                <small id="hint-release-date">
                  {trackGroup.scheduleEndOnReleaseDate ? (
                    <Trans
                      i18nKey="manageAlbum.releaseDateScheduledHint"
                      components={{ strong: <strong /> }}
                    />
                  ) : (
                    t("releaseDateInfoText")
                  )}
                </small>
              </FormComponent>
              <ManageTags tags={trackGroup.tags} />
            </div>
          </FormSection>
          <FormSection>
            <h2>{t("artwork")}</h2>
            <FormComponent
              style={{
                flexDirection: "column",
                marginRight: "1rem",
                display: "flex",
                alignItems: "flex-start",
              }}
            >
              <UploadArtistImage
                imageTypeDescription={t("anAlbumCover")}
                existing={trackGroup}
                imageType="cover"
                height="400"
                width="400"
                maxDimensions="1500x1500"
                maxSize="15mb"
              />
            </FormComponent>
          </FormSection>
          <PriceAndSuch reload={refetch} existingObject={trackGroup} />
          <FormSection>
            <h2>{t("aboutTheAlbum")}</h2>
            <FormComponent>
              <RestoredLabel htmlFor="input-about" field="about">
                {t("about")}
              </RestoredLabel>
              <TextArea id="input-about" rows={5} {...register("about")} />
            </FormComponent>
            <FormComponent>
              <RestoredLabel htmlFor="input-credits" field="credits">
                {t("credits")}
              </RestoredLabel>
              <TextArea id="input-credits" rows={5} {...register("credits")} />
            </FormComponent>
            <div
              className={css`
                @media screen and (min-width: ${bp.medium}px) {
                  display: flex;
                  gap: 1rem;
                  > div {
                    width: 33%;
                  }
                }
              `}
            >
              <FormComponent>
                <RestoredLabel
                  htmlFor="input-catalog-number"
                  field="catalogNumber"
                >
                  {t("catalogNumber")}
                </RestoredLabel>
                <InputEl
                  id="input-catalog-number"
                  {...register("catalogNumber")}
                />
              </FormComponent>
            </div>
          </FormSection>
          <FormSection>
            <FundraisingGoal
              trackGroupId={trackGroup.id}
              fundraiser={trackGroup.fundraiser}
            />
          </FormSection>
        </RestoredFieldsProvider>
      </FormProvider>
      <FormSection>
        <h2>{t("uploadTracks")}</h2>
        <ManageTrackDefaults trackGroup={trackGroup} reload={refetch} />
        {trackGroup && trackGroup?.tracks?.length > 0 && (
          <ManageTrackTable
            tracks={trackGroup.tracks}
            editable
            trackGroupId={trackGroup.id}
            artistId={artist.id}
            owned
            reload={refetch}
          />
        )}
        {trackGroup && (
          <BulkTrackUpload
            trackgroup={trackGroup}
            reload={() => refetch()}
            multiple
          />
        )}
      </FormSection>
      <FormSection>
        <h2>{t("downloadableContent")}</h2>
        <DownloadableContent
          reload={refetch}
          item={trackGroup}
          itemType="release"
        />
      </FormSection>
      <FormSection>
        <RecommendedTrackGroups trackGroupId={trackGroup.id} />
      </FormSection>
      <ArtistButtonLink
        to={getArtistManageUrl(artist.id) + "/releases/tools"}
        startIcon={<MdOutlineDownloadForOffline />}
        variant="outlined"
      >
        {t("downloadCodes")}
      </ArtistButtonLink>
      <hr className="my-8 border-(--mi-tint-x-color)" />
      <ArtistButton
        startIcon={<FaTrash />}
        onClick={() => {
          void handleDeleteTrackGroup();
        }}
        isLoading={isDeletingTrackGroup}
        className="!bg-(--mi-red-700) !border-(--mi-red-700) !text-(--mi-red-100) [&_svg]:!fill-(--mi-red-100) enabled:hover:!bg-(--mi-red-800) enabled:hover:!border-(--mi-red-800)"
      >
        {manageArtistT("delete")}
      </ArtistButton>
    </ManageSectionWrapper>
  );
};

export default ManageTrackGroup;
