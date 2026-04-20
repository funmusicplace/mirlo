import React from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import api from "services/api";
import { useSnackbar } from "state/SnackbarContext";
import { css } from "@emotion/css";
import { getReleaseUrl } from "utils/artist";
import { FaEye, FaLock } from "react-icons/fa";
import {
  ArtistButton,
  ArtistButtonLink,
} from "components/Artist/ArtistButtons";
import useArtistQuery from "utils/useArtistQuery";
import { formatDate } from "components/TrackGroup/ReleaseDate";

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

  const { trackGroupId } = useParams();
  const { data: artist } = useArtistQuery();

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
    snackbar,
    reload,
  ]);

  if (!trackGroup || !artist) {
    return null;
  }

  if (trackGroup.tracks?.length === 0 && !trackGroup.fundraisingGoal) {
    return null;
  }

  const isPublished =
    trackGroup.publishedAt && new Date(trackGroup.publishedAt) <= new Date();

  return (
    <div
      className={css`
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
      `}
    >
      {!isPublished && artist && (
        <ArtistButtonLink
          to={getReleaseUrl(artist, trackGroup)}
          startIcon={<FaEye />}
          variant="dashed"
        >
          {t("previewRelease")}
        </ArtistButtonLink>
      )}
      <ArtistButton
        startIcon={<FaLock />}
        isLoading={isPublishing}
        onClick={publishTrackGroup}
        disabled={isPublishing}
        className={css`
          background-color: var(--mi-green-500) !important;
          border-color: var(--mi-green-700) !important;
          color: var(--mi-green-100) !important;

          svg {
            fill: var(--mi-green-100) !important;
          }

          &:hover:not(:disabled) {
            background-color: var(--mi-green-700) !important;
            border-color: var(--mi-green-700) !important;
          }
        `}
      >
        {isFlowV2
          ? t(isPublished ? "makePrivateSimple" : "publishSimple")
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
