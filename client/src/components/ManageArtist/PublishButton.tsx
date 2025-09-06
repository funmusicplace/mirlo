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

const PublishButton: React.FC<{
  trackGroup: TrackGroup;
  reload: () => Promise<unknown>;
}> = ({ trackGroup, reload }) => {
  const { t } = useTranslation("translation", { keyPrefix: "manageAlbum" });
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
    try {
      if (artistUserId && trackGroupId) {
        await api.put(`manage/trackGroups/${trackGroupId}/publish`, {});
        snackbar(t(trackGroup.published ? "madePrivate" : "publishedSuccess"), {
          type: "success",
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      await reload();
      setIsPublishing(false);
    }
  }, [
    trackGroup.tracks,
    trackGroup.published,
    t,
    artistUserId,
    trackGroupId,
    snackbar,
    reload,
  ]);

  const isPublished =
    trackGroup.published ||
    (trackGroup.publishedAt && new Date(trackGroup.publishedAt) <= new Date());

  const beforeReleaseDate = new Date(trackGroup.releaseDate) > new Date();

  const publishButton = beforeReleaseDate ? "publishPreorder" : "publish";
  const privateButton = beforeReleaseDate
    ? "makePreorderPrivate"
    : "makePrivate";

  return (
    <div
      className={css`
        display: flex;
      `}
    >
      {" "}
      {!isPublished && artist && (
        <ArtistButtonLink
          to={getReleaseUrl(artist, trackGroup)}
          startIcon={<FaEye />}
          variant="dashed"
        >
          {t("previewRelease")}
        </ArtistButtonLink>
      )}
      {artist && isPublished && (
        <ArtistButtonLink
          to={getReleaseUrl(artist, trackGroup)}
          startIcon={<FaEye />}
          variant="dashed"
        >
          {t(beforeReleaseDate ? "viewPreorder" : "view")}
        </ArtistButtonLink>
      )}
      <ArtistButton
        startIcon={<FaLock />}
        isLoading={isPublishing}
        onClick={publishTrackGroup}
        disabled={isPublishing}
        className={css`
          margin-left: 0.75rem;
        `}
      >
        {t(isPublished ? privateButton : publishButton)}
      </ArtistButton>
    </div>
  );
};

export default PublishButton;
