import React from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useArtistContext } from "state/ArtistContext";
import api from "services/api";
import { useSnackbar } from "state/SnackbarContext";
import Button, { ButtonLink } from "components/common/Button";
import { css } from "@emotion/css";
import { getReleaseUrl } from "utils/artist";
import { FaEye, FaLock } from "react-icons/fa";
import {
  ArtistButton,
  ArtistButtonLink,
} from "components/Artist/ArtistButtons";

const PublishButton: React.FC<{
  trackGroup: TrackGroup;
  reload: () => Promise<unknown>;
}> = ({ trackGroup, reload }) => {
  const { t } = useTranslation("translation", { keyPrefix: "manageAlbum" });
  const snackbar = useSnackbar();

  const [isPublishing, setIsPublishing] = React.useState(false);

  const { trackGroupId } = useParams();
  const {
    state: { artist },
  } = useArtistContext();

  const artistUserId = artist?.userId;

  const publishTrackGroup = React.useCallback(async () => {
    setIsPublishing(true);
    const anyIncomplete = trackGroup.tracks.find(
      (t) => t.audio?.uploadState !== "SUCCESS"
    );
    if (anyIncomplete && !window.confirm(t("areYouSurePublish") ?? "")) {
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
      {artist && trackGroup.published && (
        <ArtistButtonLink
          to={getReleaseUrl(artist, trackGroup)}
          size="big"
          rounded
          startIcon={<FaEye />}
          variant="dashed"
        >
          {t(beforeReleaseDate ? "viewPreorder" : "view")}
        </ArtistButtonLink>
      )}
      <ArtistButton
        size="big"
        rounded
        startIcon={<FaLock />}
        isLoading={isPublishing}
        onClick={publishTrackGroup}
        disabled={isPublishing}
        className={css`
          margin-left: 0.75rem;
        `}
      >
        {t(trackGroup.published ? privateButton : publishButton)}
      </ArtistButton>
    </div>
  );
};

export default PublishButton;
