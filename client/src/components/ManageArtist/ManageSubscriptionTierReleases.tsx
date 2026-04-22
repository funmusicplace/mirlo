import React from "react";
import { useTranslation } from "react-i18next";
import { useSnackbar } from "state/SnackbarContext";
import useErrorHandler from "services/useErrorHandler";
import FormComponent from "components/common/FormComponent";
import ReleaseListSelector from "components/common/ReleaseListSelector";
import api from "services/api";
import LoadingSpinner from "components/common/LoadingSpinner";

const ManageSubscriptionTierReleases: React.FC<{
  tier: ArtistSubscriptionTier;
  artistId: number;
  reload: () => void;
}> = ({ tier, artistId, reload }) => {
  const { t } = useTranslation("translation", { keyPrefix: "manageArtist" });
  const snackbar = useSnackbar();
  const errorHandler = useErrorHandler();
  const [isSaving, setIsSaving] = React.useState(false);
  const [selectedReleaseIds, setSelectedReleaseIds] = React.useState<number[]>(
    tier.releases?.map((r) => r.trackGroupId) ?? []
  );

  const handleSelectionsChange = React.useCallback(
    async (newSelectedIds: number[]) => {
      try {
        setIsSaving(true);
        const currentIds = new Set(
          tier.releases?.map((r) => r.trackGroupId) ?? []
        );
        const newIds = new Set(newSelectedIds);

        // Find releases to add and remove
        const toAdd = Array.from(newIds).filter((id) => !currentIds.has(id));
        const toRemove = Array.from(currentIds).filter((id) => !newIds.has(id));

        // Add new releases
        for (const trackGroupId of toAdd) {
          await api.post(
            `manage/artists/${artistId}/subscriptionTiers/${tier.id}/releases`,
            {
              trackGroupId,
            }
          );
        }

        // Remove releases
        for (const trackGroupId of toRemove) {
          await api.delete(
            `manage/artists/${artistId}/subscriptionTiers/${tier.id}/releases?trackGroupId=${trackGroupId}`
          );
        }

        if (toAdd.length > 0 || toRemove.length > 0) {
          snackbar(t("releaseSelectionUpdated", "Release selection updated"), {
            type: "success",
          });
          reload();
        }

        setSelectedReleaseIds(newSelectedIds);
      } catch (e) {
        errorHandler(e);
        // Reset to previous state on error
        setSelectedReleaseIds(tier.releases?.map((r) => r.trackGroupId) ?? []);
      } finally {
        setIsSaving(false);
      }
    },
    [tier.id, tier.releases, artistId, t, snackbar, errorHandler, reload]
  );

  console.log("selectedReleaseIds", tier);

  return (
    <div className="pt-2">
      <FormComponent>
        <label>{t("subscriptionTierReleases")}</label>
        <small className="block mb-2">
          {t("subscriptionTierReleasesHint")}
        </small>

        <ReleaseListSelector
          artistId={artistId}
          selectedReleaseIds={selectedReleaseIds}
          onSelectChange={handleSelectionsChange}
          isSaving={isSaving}
          maxHeight="350px"
        />
      </FormComponent>
    </div>
  );
};

export default ManageSubscriptionTierReleases;
