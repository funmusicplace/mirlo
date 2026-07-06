import { ArtistButton } from "components/Artist/ArtistButtons";
import { useSaveAlbumFormMutation } from "queries/trackGroups";
import React from "react";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import api from "services/api";
import useErrorHandler from "services/useErrorHandler";
import { useSnackbar } from "state/SnackbarContext";
import { isTrackGroupPublished } from "utils/artist";
import useArtistQuery from "utils/useArtistQuery";

import { TrackGroupFormData } from "pages/manage/artists/{artistId}/release/{trackGroupId}/Index";

const PublishButton: React.FC<{
  trackGroup: TrackGroup;
  reload: () => Promise<unknown>;
  onSaveSuccess?: () => void;
}> = ({ trackGroup, reload, onSaveSuccess }) => {
  const { t } = useTranslation("translation", {
    keyPrefix: "manageAlbum",
  });
  const snackbar = useSnackbar();
  const errorHandler = useErrorHandler();

  const [isPublishing, setIsPublishing] = React.useState(false);

  const { artistId, trackGroupId } = useParams();
  const { data: artist } = useArtistQuery();
  const methods = useFormContext<TrackGroupFormData>();
  const isDirty = methods?.formState.isDirty ?? false;

  const artistUserId = artist?.userId;
  const saveMutation = useSaveAlbumFormMutation();

  const saveCurrentForm = React.useCallback(async () => {
    const values = methods.getValues();
    await saveMutation.mutateAsync({
      formData: values,
      trackGroupId: trackGroup.id,
      artistId: Number(artistId),
      fundraiserId: trackGroup.fundraiser?.id,
    });
    methods.reset(values);
  }, [
    methods,
    saveMutation,
    trackGroup.id,
    trackGroup.fundraiser?.id,
    artistId,
  ]);

  const publishTrackGroup = React.useCallback(async () => {
    setIsPublishing(true);

    if (
      trackGroup.publishedAt &&
      new Date(trackGroup.publishedAt) > new Date() &&
      !window.confirm(
        t("publishNowInsteadOf", {
          futureDate: trackGroup.publishedAt.split("T")[0],
        }) ?? ""
      )
    ) {
      setIsPublishing(false);
      return;
    }
    const noTracks = trackGroup.tracks.length === 0;
    const anyIncomplete = trackGroup.tracks.find(
      (t) => t.audio?.uploadState !== "SUCCESS"
    );

    if (
      (anyIncomplete || noTracks) &&
      !window.confirm(t(anyIncomplete ? "areYouSurePublish" : "noTracks") ?? "")
    ) {
      setIsPublishing(false);
      return;
    }

    const tracksBlank = trackGroup.tracks.filter(
      (t) => !t.title || t.title.trim() === ""
    );

    if (
      tracksBlank.length > 0 &&
      !window.confirm(
        t("tracksMissingTitle", { count: tracksBlank.length }) ?? ""
      )
    ) {
      setIsPublishing(false);
      return;
    }

    try {
      if (artistUserId && trackGroupId) {
        if (isDirty) {
          await saveCurrentForm();
          onSaveSuccess?.();
        }
        await api.put(`manage/trackGroups/${trackGroupId}/publish`, {});
        snackbar(
          t(trackGroup.publishedAt ? "madePrivate" : "publishedSuccess"),
          {
            type: "success",
          }
        );
      }
    } catch (e) {
      console.error(e);
      snackbar((e as { message: string }).message ?? t("somethingWentWrong"), {
        type: "warning",
      });
    } finally {
      await reload();
      setIsPublishing(false);
    }
  }, [
    trackGroup.tracks,
    trackGroup.publishedAt,
    t,
    artistUserId,
    trackGroupId,
    isDirty,
    saveCurrentForm,
    onSaveSuccess,
    snackbar,
    reload,
  ]);

  const updateRelease = React.useCallback(async () => {
    try {
      await saveCurrentForm();
      onSaveSuccess?.();
      snackbar(t("releaseUpdated"), { type: "success" });
    } catch (e) {
      errorHandler(e);
    }
  }, [saveCurrentForm, onSaveSuccess, snackbar, errorHandler, t]);

  if (!trackGroup || !artist) {
    return null;
  }

  const isPublished = isTrackGroupPublished(trackGroup);

  if (isPublished) {
    return (
      <div className="flex flex-wrap gap-3">
        <ArtistButton
          type="button"
          isLoading={saveMutation.isPending}
          onClick={updateRelease}
          disabled={saveMutation.isPending || !isDirty}
          className="!bg-(--mi-green-500) !border-(--mi-green-700) !text-(--mi-green-100) [&_svg]:!fill-(--mi-green-100) enabled:hover:!bg-(--mi-green-700) enabled:hover:!border-(--mi-green-700) disabled:grayscale disabled:!opacity-50"
        >
          {t("updateRelease")}
        </ArtistButton>
      </div>
    );
  }

  const nothingToPublish =
    trackGroup.tracks?.length === 0 && !trackGroup.fundraisingGoal;

  return (
    <div className="flex flex-wrap gap-3">
      <ArtistButton
        type="button"
        isLoading={isPublishing}
        onClick={publishTrackGroup}
        disabled={isPublishing || nothingToPublish}
        title={nothingToPublish ? t("publishDisabledNoTracks") : undefined}
        className="!bg-(--mi-green-500) !border-(--mi-green-700) !text-(--mi-green-100) [&_svg]:!fill-(--mi-green-100) enabled:hover:!bg-(--mi-green-700) enabled:hover:!border-(--mi-green-700) disabled:grayscale disabled:!opacity-50"
      >
        {t("publishSimple")}
      </ArtistButton>
    </div>
  );
};

export default PublishButton;
