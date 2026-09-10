import { useQuery } from "@tanstack/react-query";
import { ArtistButton } from "components/Artist/ArtistButtons";
import FormComponent from "components/common/FormComponent";
import { SelectEl } from "components/common/Select";
import { queryLicenses } from "queries/licenses";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import api from "services/api";
import { useSnackbar } from "state/SnackbarContext";

/**
 * Bulk-applies one license to every track on a release, the same way
 * {@link SetPriceOfAllTracks} bulk-applies a price. There's no album-level
 * license column, so this only writes the tracks. See #1305.
 */
const SetLicenseOfAllTracks: React.FC<{
  tracks: Track[];
  reload: () => void;
}> = ({ tracks, reload }) => {
  const { t } = useTranslation("translation", { keyPrefix: "manageAlbum" });
  const snackbar = useSnackbar();
  const [licenseId, setLicenseId] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const { data: licenses } = useQuery(queryLicenses());

  const handleBulkUpdate = async () => {
    if (!licenseId) {
      return;
    }
    setIsSaving(true);
    try {
      await Promise.all(
        tracks.map((track) =>
          api.put(`manage/tracks/${track.id}`, {
            licenseId: Number(licenseId),
          })
        )
      );
      snackbar(t("updatedAllTracks"), { type: "success" });
      reload();
    } catch (error) {
      console.error("Error updating tracks:", error);
      snackbar(t("errorUpdatingTracks"), { type: "warning" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-4 items-end py-2 [&>div]:mb-0!">
      <FormComponent>
        <label htmlFor="licenseOnAllTracks">{t("licenseOnAllTracks")}</label>
        <SelectEl
          id="licenseOnAllTracks"
          value={licenseId}
          onChange={(e) => setLicenseId(e.target.value)}
        >
          <option value="">{t("selectALicense")}</option>
          {licenses?.results.map((license) => (
            <option key={license.id} value={license.id}>
              {license.short}
            </option>
          ))}
        </SelectEl>
      </FormComponent>
      <ArtistButton
        wrap
        type="button"
        disabled={!licenseId || isSaving}
        isLoading={isSaving}
        onClick={handleBulkUpdate}
      >
        {t("setLicenseOfAllTracks")}
      </ArtistButton>
    </div>
  );
};

export default SetLicenseOfAllTracks;
