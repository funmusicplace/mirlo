import Button from "components/common/Button";
import { SelectEl } from "components/common/Select";
import { formatDate } from "components/TrackGroup/ReleaseDate";
import {
  AdminContentFlag,
  useUpdateAdminArtistMutation,
  useUpdateAdminContentFlagMutation,
  useUpdateAdminTrackGroupMutation,
} from "queries/admin";
import React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useSnackbar } from "state/SnackbarContext";
import { getReleaseUrl } from "utils/artist";

import ContentFlagDetails from "./ContentFlagDetails";
import DisableArtistModal from "./DisableArtistModal";

type ReleaseStatus = "visible" | "hiddenFromSearch" | "disabled";
type ArtistStatus = "visible" | "disabled";

const RELEASE_STATUSES: ReleaseStatus[] = [
  "visible",
  "hiddenFromSearch",
  "disabled",
];
const ARTIST_STATUSES: ArtistStatus[] = ["visible", "disabled"];

const getReleaseStatus = (trackGroup: {
  adminEnabled: boolean;
  hideFromSearch: boolean;
}): ReleaseStatus => {
  if (!trackGroup.adminEnabled) {
    return "disabled";
  }
  return trackGroup.hideFromSearch ? "hiddenFromSearch" : "visible";
};

const ContentFlagRow: React.FC<{ flag: AdminContentFlag }> = ({ flag }) => {
  const { t, i18n } = useTranslation("translation", {
    keyPrefix: "flaggedContent",
  });
  const snackbar = useSnackbar();
  const [showDisableModal, setShowDisableModal] = React.useState(false);

  const { mutateAsync: updateFlag, isPending: isUpdatingFlag } =
    useUpdateAdminContentFlagMutation();
  const { mutateAsync: updateTrackGroup, isPending: isUpdatingTrackGroup } =
    useUpdateAdminTrackGroupMutation();
  const { mutateAsync: updateArtist, isPending: isUpdatingArtist } =
    useUpdateAdminArtistMutation();

  const isPending = isUpdatingFlag || isUpdatingTrackGroup || isUpdatingArtist;
  const isResolved = flag.resolvedAt !== null;
  const { artist, trackGroup } = flag;

  const run = React.useCallback(
    async (action: () => Promise<unknown>) => {
      try {
        await action();
        snackbar(t("updateSuccess"), { type: "success" });
      } catch (e) {
        console.error(e);
        snackbar(t("updateError"), { type: "warning" });
      }
    },
    [snackbar, t]
  );

  const onChangeReleaseStatus = React.useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      if (!trackGroup) {
        return;
      }
      const status = e.target.value as ReleaseStatus;
      run(() =>
        updateTrackGroup({
          trackGroupId: trackGroup.id,
          adminEnabled: status !== "disabled",
          hideFromSearch:
            status === "disabled"
              ? trackGroup.hideFromSearch
              : status === "hiddenFromSearch",
        })
      );
    },
    [run, trackGroup, updateTrackGroup]
  );

  const onChangeArtistStatus = React.useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      if (!artist) {
        return;
      }
      if (e.target.value === "disabled") {
        setShowDisableModal(true);
        return;
      }
      run(() => updateArtist({ artistId: artist.id, enabled: true }));
    },
    [artist, run, updateArtist]
  );

  return (
    <>
      <tr>
        <td>{formatDate({ date: flag.createdAt, i18n })}</td>
        <td>
          <ContentFlagDetails flag={flag} />
        </td>
        <td>
          <div className="flex flex-col gap-1">
            {artist && trackGroup && (
              <Link to={getReleaseUrl(artist, trackGroup)}>
                {trackGroup.title}
              </Link>
            )}
            {artist && (
              <Link to={`/admin/content/artists/${artist.id}`}>
                {artist.name}
              </Link>
            )}
          </div>
        </td>
        <td>
          {trackGroup && (
            <>
              <label
                htmlFor={`input-release-status-${flag.id}`}
                className="sr-only"
              >
                {t("columnRelease")}
              </label>
              <SelectEl
                id={`input-release-status-${flag.id}`}
                className="w-full"
                variant="compact"
                value={getReleaseStatus(trackGroup)}
                onChange={onChangeReleaseStatus}
                disabled={isPending}
              >
                {RELEASE_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {t(`status.${status}`)}
                  </option>
                ))}
              </SelectEl>
            </>
          )}
        </td>
        <td>
          {artist && (
            <>
              <label
                htmlFor={`input-artist-status-${flag.id}`}
                className="sr-only"
              >
                {t("columnArtist")}
              </label>
              <SelectEl
                id={`input-artist-status-${flag.id}`}
                className="w-full"
                variant="compact"
                value={artist.enabled ? "visible" : "disabled"}
                onChange={onChangeArtistStatus}
                disabled={isPending}
              >
                {ARTIST_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {t(`status.${status}`)}
                  </option>
                ))}
              </SelectEl>
            </>
          )}
        </td>
        <td className="text-right">
          <Button
            type="button"
            size="compact"
            disabled={isPending}
            onClick={() =>
              run(() => updateFlag({ flagId: flag.id, resolved: !isResolved }))
            }
          >
            {isResolved ? t("unresolveFlag") : t("resolveFlag")}
          </Button>
          {isResolved && flag.resolvedByUser && (
            <small className="block mt-2">
              {t("resolvedBy", {
                name: flag.resolvedByUser.name ?? flag.resolvedByUser.email,
              })}
            </small>
          )}
        </td>
      </tr>
      {artist && (
        <DisableArtistModal
          artistId={artist.id}
          artistName={artist.name}
          open={showDisableModal}
          onClose={() => setShowDisableModal(false)}
        />
      )}
    </>
  );
};

export default ContentFlagRow;
