import DisableArtistModal from "components/Admin/DisableArtistModal";
import Button from "components/common/Button";
import SpaceBetweenDiv from "components/common/SpaceBetweenDiv";
import Table from "components/common/Table";
import { Toggle } from "components/common/Toggle";
import {
  useAdminArtistQuery,
  useUpdateAdminArtistMutation,
} from "queries/admin";
import React from "react";
import { useTranslation } from "react-i18next";
import { FaArrowCircleLeft } from "react-icons/fa";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "services/api";
import { useSnackbar } from "state/SnackbarContext";
import { getArtistManageUrl } from "utils/artist";

const Index = () => {
  const { id } = useParams();
  const { data: artist } = useAdminArtistQuery(id);
  const { mutateAsync: updateArtist } = useUpdateAdminArtistMutation();
  const snackbar = useSnackbar();
  const navigate = useNavigate();
  const { t } = useTranslation("translation", { keyPrefix: "admin" });
  const [showDisableModal, setShowDisableModal] = React.useState(false);

  const onDeleteClick = React.useCallback(async () => {
    if (window.confirm(t("deleteArtistConfirm", { name: artist?.name }))) {
      await api.delete(`admin/artists/${id}`);
      snackbar(t("artistDeleteSuccess", { name: artist?.name }), {
        type: "success",
      });
      navigate("/admin/content/artists");
    }
  }, [id, artist?.name, t]);

  const handleDisableToggle = React.useCallback(
    async (checked: boolean) => {
      if (!checked) {
        setShowDisableModal(true);
      } else if (artist) {
        await updateArtist({ artistId: artist.id, enabled: true });
        snackbar(t("artistEnableSuccess", { name: artist.name }), {
          type: "success",
        });
      }
    },
    [artist, snackbar, t, updateArtist]
  );

  if (!artist) {
    return null;
  }

  return (
    <>
      <div>
        <SpaceBetweenDiv>
          <div className="flex justify-between">
            <h2 className="flex items-center">
              <Link to="/admin/content/users" className="mr-1">
                <FaArrowCircleLeft />
              </Link>
              Artist "{artist.name}"
            </h2>
          </div>
          <div>
            <Link to={getArtistManageUrl(artist.id)}>
              <Button>{t("manageArtist")}</Button>
            </Link>
          </div>
        </SpaceBetweenDiv>
        <div>
          <Table>
            <tbody>
              <tr>
                <td>name</td>
                <td>{artist.name}</td>
              </tr>

              <tr>
                <td>{t("isEnabledLabel")}</td>
                <td>
                  <div className="flex flex-col">
                    <Toggle
                      toggled={artist.enabled}
                      label=""
                      onClick={handleDisableToggle}
                    />
                    <small>{t("artistEnabledDescription")}</small>
                  </div>
                </td>
              </tr>
            </tbody>
          </Table>
          <Button onClick={onDeleteClick}>{t("deleteArtist")}</Button>
        </div>
      </div>

      <DisableArtistModal
        artistId={artist.id}
        artistName={artist.name}
        open={showDisableModal}
        onClose={() => setShowDisableModal(false)}
      />
    </>
  );
};

export default Index;
