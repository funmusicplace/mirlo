import { css } from "@emotion/css";
import { ArtistButton } from "components/Artist/ArtistButtons";
import FormCheckbox from "components/common/FormCheckbox";
import FormComponent from "components/common/FormComponent";
import { InputEl } from "components/common/Input";
import React, { useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import api from "services/api";
import { useSnackbar } from "state/SnackbarContext";

interface BulkUpdateTracksProps {
  tracks: Track[];
  reload: () => void;
}

const AllowAllTracksForPromo: React.FC<BulkUpdateTracksProps> = ({
  reload,
  tracks,
}) => {
  const { t } = useTranslation("translation", { keyPrefix: "manageAlbum" });
  const snackbar = useSnackbar();
  const [allowMirloPromo, setAllowMirloPromo] = useState<boolean>(
    tracks.every((track) => track.allowMirloPromo)
  );

  const handleBulkUpdate = async (allowMirloPromo: boolean) => {
    try {
      await Promise.all(
        tracks.map((track) => {
          return api.put(`manage/tracks/${track.id}`, {
            allowMirloPromo,
          });
        })
      );
      setAllowMirloPromo(allowMirloPromo);
      snackbar(t("updatedAllTracks"), { type: "success" });
      reload();
    } catch (error) {
      console.error("Error updating tracks:", error);
    }
  };

  return (
    <div
      className={css`
        display: flex;
        gap: 1rem;
        align-items: center;
        padding: 1rem 0;
      `}
    >
      <InputEl
        type="checkbox"
        id="allowMirloPromo"
        checked={allowMirloPromo}
        onChange={() => handleBulkUpdate(!allowMirloPromo)}
      />{" "}
      <label htmlFor="allowMirloPromo">
        <Trans
          t={t}
          i18nKey={"allowMirloPromo"}
          components={{
            hype: <Link to="/team/posts/236/"></Link>,
          }}
        />
      </label>
    </div>
  );
};

export default AllowAllTracksForPromo;
