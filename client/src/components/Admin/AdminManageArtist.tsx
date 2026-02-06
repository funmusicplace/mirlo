import Button from "components/common/Button";
import SpaceBetweenDiv from "components/common/SpaceBetweenDiv";
import Table from "components/common/Table";
import { Toggle } from "components/common/Toggle";
import Modal from "components/common/Modal";
import React from "react";
import { FaArrowCircleLeft } from "react-icons/fa";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "services/api";
import { useSnackbar } from "state/SnackbarContext";
import { useTranslation } from "react-i18next";
import { getArtistManageUrl } from "utils/artist";
import TextArea from "components/common/TextArea";

const AdminManageArtist = () => {
  const { id } = useParams();
  const [artist, setArtist] = React.useState<ArtistFromAdmin>();
  const snackbar = useSnackbar();
  const navigate = useNavigate();
  const { t } = useTranslation("translation", { keyPrefix: "admin" });
  const [showDisableModal, setShowDisableModal] = React.useState(false);
  const [disableReason, setDisableReason] = React.useState("");
  const [isSubmittingDisable, setIsSubmittingDisable] = React.useState(false);

  const PREFILL_CONTENT_POLICY =
    "Your artist account has been disabled due to a violation of our Content Policy regarding AI-generated content: http://mirlo.space/pages/content-policy" +
    "\n\nThis determination was made after reviewing the artwork and/or music associated with your account. " +
    "\n\nIf you believe this decision was made in error, you can contest it by emailing support@mirlo.space with evidence supporting your appeal." +
    "\n\nWe recognize that for many in our community, they rely on AI tools because they don't have specific skills. We suggest joining our community or tagging us on socials, and we'll boost your post to connect you with people who might want to help.";

  const callback = React.useCallback(async () => {
    const response = await api.get<ArtistFromAdmin>(`admin/artists/${id}`);
    setArtist(response.result);
  }, [id]);

  const onDeleteClick = React.useCallback(async () => {
    if (window.confirm(t("deleteArtistConfirm", { name: artist?.name }))) {
      await api.delete(`admin/artists/${id}`);
      snackbar(t("artistDeleteSuccess", { name: artist?.name }), {
        type: "success",
      });
      navigate("/admin/artists");
    }
  }, [id, artist?.name, t]);

  const handleDisableToggle = React.useCallback(
    async (checked: boolean) => {
      if (!checked) {
        // Disabling the artist - show modal to get reason
        setDisableReason("");
        setShowDisableModal(true);
      } else {
        // Enabling the artist - no confirmation needed
        await api.put(`admin/artists/${id}`, {
          enabled: checked,
        });
        callback();
        snackbar(t("artistEnableSuccess", { name: artist?.name }), {
          type: "success",
        });
      }
    },
    [id, artist?.name, callback, snackbar, t]
  );

  const handleSubmitDisable = React.useCallback(async () => {
    if (!disableReason.trim()) {
      snackbar(t("disableReasonRequired"), {
        type: "warning",
      });
      return;
    }

    try {
      setIsSubmittingDisable(true);
      await api.put(`admin/artists/${id}`, {
        enabled: false,
        disableReason: disableReason.trim(),
      });
      setShowDisableModal(false);
      setDisableReason("");
      callback();
      snackbar(t("artistDisableSuccess", { name: artist?.name }), {
        type: "success",
      });
    } catch (error) {
      snackbar(t("failedToDisableArtist"));
    } finally {
      setIsSubmittingDisable(false);
    }
  }, [id, disableReason, artist?.name, callback, snackbar, t]);

  React.useEffect(() => {
    callback();
  }, [callback]);

  if (!artist) {
    return null;
  }

  return (
    <>
      <div>
        <SpaceBetweenDiv>
          <div className="flex justify-between">
            <h2 className="flex items-center">
              <Link to="/admin/users" className="mr-1">
                <FaArrowCircleLeft />
              </Link>
              Artist "{artist.name}"
            </h2>
          </div>
          <div>
            <Link to={getArtistManageUrl(artist.id)}>
              <Button>{t("manageArtist") ?? "Manage Artist"}</Button>
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

      <Modal
        open={showDisableModal}
        onClose={() => setShowDisableModal(false)}
        title={t("disableArtistModal")}
        size="small"
      >
        <div className="flex flex-col gap-4">
          <p>{t("disableArtistDescription")}</p>

          <TextArea
            value={disableReason}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              setDisableReason(e.target.value)
            }
            placeholder={t("disableReasonPlaceholder")}
            rows={6}
          />

          <div className="flex flex-col gap-2">
            <Button
              onClick={() => setDisableReason(PREFILL_CONTENT_POLICY)}
              type="button"
            >
              {t("prefillContentPolicy")}
            </Button>
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              onClick={() => setShowDisableModal(false)}
              type="button"
              disabled={isSubmittingDisable}
            >
              {t("cancelButton")}
            </Button>
            <Button
              onClick={handleSubmitDisable}
              type="button"
              disabled={isSubmittingDisable || !disableReason.trim()}
            >
              {isSubmittingDisable
                ? t("disablingArtist")
                : t("disableArtistButton")}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default AdminManageArtist;
