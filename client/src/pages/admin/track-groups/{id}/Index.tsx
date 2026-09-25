import Button from "components/common/Button";
import SpaceBetweenDiv from "components/common/SpaceBetweenDiv";
import Table from "components/common/Table";
import { Toggle } from "components/common/Toggle";
import { formatDate } from "components/TrackGroup/ReleaseDate";
import { useUpdateAdminTrackGroupMutation } from "queries/admin";
import React from "react";
import { useTranslation } from "react-i18next";
import { FaArrowCircleLeft } from "react-icons/fa";
import { Link, useParams } from "react-router-dom";
import api from "services/api";
import useErrorHandler from "services/useErrorHandler";
import { useSnackbar } from "state/SnackbarContext";
import { getManageReleaseUrl } from "utils/artist";

const Index: React.FC = () => {
  const { id } = useParams();
  const snackbar = useSnackbar();
  const errorHandler = useErrorHandler();
  const { t, i18n } = useTranslation("translation", { keyPrefix: "admin" });
  const { mutateAsync: updateTrackGroup } = useUpdateAdminTrackGroupMutation();
  const [trackGroup, setTrackGroup] = React.useState<TrackGroup>();

  const fetchTrackGroup = React.useCallback(async () => {
    const { result } = await api.get<TrackGroup>(`trackGroups/${id}`);
    setTrackGroup(result);
  }, [id]);

  React.useEffect(() => {
    if (id) {
      fetchTrackGroup();
    }
  }, [fetchTrackGroup, id]);

  const save = React.useCallback(
    async (changes: { adminEnabled?: boolean; hideFromSearch?: boolean }) => {
      if (!trackGroup) {
        return;
      }
      try {
        await updateTrackGroup({
          trackGroupId: trackGroup.id,
          adminEnabled: trackGroup.adminEnabled,
          hideFromSearch: trackGroup.hideFromSearch ?? false,
          ...changes,
        });
        snackbar(t("trackGroupUpdateSuccess"), { type: "success" });
        await fetchTrackGroup();
      } catch (e) {
        errorHandler(e);
      }
    },
    [errorHandler, fetchTrackGroup, snackbar, t, trackGroup, updateTrackGroup]
  );

  if (!trackGroup) {
    return null;
  }

  return (
    <div>
      <SpaceBetweenDiv>
        <h2 className="flex items-center">
          <Link to="/admin/content/track-groups" className="mr-1">
            <FaArrowCircleLeft />
          </Link>
          {t("trackGroup")} "{trackGroup.title}"
        </h2>
        <Link to={getManageReleaseUrl(trackGroup.artist, trackGroup)}>
          <Button>{t("manageRelease")}</Button>
        </Link>
      </SpaceBetweenDiv>
      <Table>
        <tbody>
          <tr>
            <td>{t("title")}</td>
            <td>{trackGroup.title}</td>
          </tr>
          <tr>
            <td>{t("artist")}</td>
            <td>
              <Link to={`/admin/content/artists/${trackGroup.artist.id}`}>
                {trackGroup.artist.name}
              </Link>
            </td>
          </tr>
          <tr>
            <td>{t("releaseDate")}</td>
            <td>
              {trackGroup.releaseDate
                ? formatDate({ date: trackGroup.releaseDate, i18n })
                : "-"}
            </td>
          </tr>
          <tr>
            <td>{t("isEnabledLabel")}</td>
            <td>
              <div className="flex flex-col">
                <Toggle
                  toggled={trackGroup.adminEnabled}
                  label=""
                  onClick={(adminEnabled) => save({ adminEnabled })}
                />
                <small>{t("trackGroupEnabledDescription")}</small>
              </div>
            </td>
          </tr>
          <tr>
            <td>{t("hideFromSearch")}</td>
            <td>
              <div className="flex flex-col">
                <Toggle
                  toggled={!!trackGroup.hideFromSearch}
                  label=""
                  onClick={(hideFromSearch) => save({ hideFromSearch })}
                />
                <small>{t("hideFromSearchDescription")}</small>
              </div>
            </td>
          </tr>
        </tbody>
      </Table>
    </div>
  );
};

export default Index;
