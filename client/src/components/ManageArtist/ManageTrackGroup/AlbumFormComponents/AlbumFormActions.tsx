import { cx } from "@emotion/css";
import { ArtistButtonLink } from "components/Artist/ArtistButtons";
import PublishButton from "components/ManageArtist/PublishButton";
import React from "react";
import { useTranslation } from "react-i18next";
import { FaEye } from "react-icons/fa";
import { getReleaseUrl, isTrackGroupPublished } from "utils/artist";

import SaveDraftBar from "./SaveDraftBar";
import SchedulePublication from "./SchedulePublication";

const AlbumFormActions: React.FC<{
  existingObject: TrackGroup;
  reload: () => Promise<unknown>;
  onSaveSuccess?: () => void;
  className?: string;
}> = ({ existingObject, reload, onSaveSuccess, className }) => {
  const { t } = useTranslation("translation", { keyPrefix: "manageAlbum" });

  return (
    <div
      className={cx(
        "flex flex-wrap items-start gap-2 bg-(--mi-background-color) py-4",
        className
      )}
    >
      <SaveDraftBar
        existingObject={existingObject}
        onSaveSuccess={onSaveSuccess}
      />
      {!isTrackGroupPublished(existingObject) &&
        (existingObject.tracks?.length > 0 || !!existingObject.fundraiser) &&
        existingObject.artist && (
          <ArtistButtonLink
            to={getReleaseUrl(existingObject.artist, existingObject)}
            startIcon={<FaEye />}
            variant="dashed"
          >
            {t("previewRelease")}
          </ArtistButtonLink>
        )}
      <div className="ml-auto flex flex-col items-end gap-1">
        <PublishButton
          trackGroup={existingObject}
          reload={reload}
          onSaveSuccess={onSaveSuccess}
        />
        <SchedulePublication existingObject={existingObject} reload={reload} />
      </div>
    </div>
  );
};

export default AlbumFormActions;
