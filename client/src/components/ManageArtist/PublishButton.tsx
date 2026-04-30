import { ArtistButton } from "components/Artist/ArtistButtons";
import { formatDate } from "components/TrackGroup/ReleaseDate";
import React from "react";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { FaLock } from "react-icons/fa";
import { useParams } from "react-router-dom";
import api from "services/api";
import { useSnackbar } from "state/SnackbarContext";
import { isTrackGroupPublished } from "utils/artist";
import useArtistQuery from "utils/useArtistQuery";

const PublishButton: React.FC<{
  trackGroup: TrackGroup;
  reload: () => Promise<unknown>;
  isFlowV2?: boolean;
}> = ({ trackGroup, reload, isFlowV2 }) => {
  const { t, i18n } = useTranslation("translation", {
    keyPrefix: "manageAlbum",
  });
  const snackbar = useSnackbar();

  const [isPublishing, setIsPublishing] = React.useState(false);
  const [isUpdating, setIsUpdating] = React.useState(false);

  const { artistId, trackGroupId } = useParams();
  const { data: artist } = useArtistQuery();
  const formContext = useFormContext();

  const artistUserId = artist?.userId;

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
        if (formContext && artistId) {
          const values = formContext.getValues();
          const desiredIsPublic = values.isPublic ?? trackGroup.isPublic;
          if (desiredIsPublic !== trackGroup.isPublic) {
            await api.put(`manage/trackGroups/${trackGroupId}`, {
              isPublic: desiredIsPublic,
              artistId: Number(artistId),
            });
          }
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
    trackGroup.isPublic,
    t,
    artistUserId,
    artistId,
    trackGroupId,
    formContext,
    snackbar,
    reload,
  ]);

  const updateRelease = React.useCallback(async () => {
    if (!trackGroupId || !artistId || !formContext) return;
    setIsUpdating(true);
    try {
      const values = formContext.getValues();
      await api.put(`manage/trackGroups/${trackGroupId}`, {
        title: values.title,
        about: values.about,
        credits: values.credits,
        releaseDate: values.releaseDate
          ? new Date(values.releaseDate).toISOString()
          : null,
        publishedAt: values.publishedAt
          ? new Date(values.publishedAt).toISOString()
          : null,
        minPrice: values.minPrice ? Number(values.minPrice) * 100 : null,
        suggestedPrice: values.suggestedPrice
          ? Number(values.suggestedPrice) * 100
          : null,
        catalogNumber: values.catalogNumber,
        urlSlug: values.urlSlug,
        isPublic: values.isPublic,
        artistId: Number(artistId),
      });
      await reload();
      snackbar(t("releaseUpdated"), { type: "success" });
    } catch (e) {
      snackbar((e as { message: string }).message ?? t("somethingWentWrong"), {
        type: "warning",
      });
    } finally {
      setIsUpdating(false);
    }
  }, [trackGroupId, artistId, formContext, reload, snackbar, t]);

  if (!trackGroup || !artist) {
    return null;
  }

  const isPublished = isTrackGroupPublished(trackGroup);

  if (isFlowV2 && isPublished) {
    return (
      <div className="flex flex-wrap gap-3">
        <ArtistButton
          startIcon={<FaLock />}
          isLoading={isUpdating}
          onClick={updateRelease}
          disabled={isUpdating}
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
        startIcon={<FaLock />}
        isLoading={isPublishing}
        onClick={publishTrackGroup}
        disabled={isPublishing || nothingToPublish}
        title={nothingToPublish ? t("publishDisabledNoTracks") : undefined}
        className="!bg-(--mi-green-500) !border-(--mi-green-700) !text-(--mi-green-100) [&_svg]:!fill-(--mi-green-100) enabled:hover:!bg-(--mi-green-700) enabled:hover:!border-(--mi-green-700) disabled:grayscale disabled:!opacity-50"
      >
        {isFlowV2
          ? t("publishSimple")
          : t(isPublished ? "makePrivate" : "publish", {
              date: trackGroup.publishedAt
                ? formatDate({
                    date: trackGroup.publishedAt,
                    options: {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    },
                    i18n,
                  })
                : t("now"),
            })}
      </ArtistButton>
    </div>
  );
};

export default PublishButton;
