import { css } from "@emotion/css";
import Button from "components/common/Button";
import Modal from "components/common/Modal";
import React from "react";
import { useTranslation } from "react-i18next";
import { useSnackbar } from "state/SnackbarContext";
import api from "services/api";
import { useNavigate } from "react-router-dom";

const AddToCollection: React.FC<{ trackGroup: TrackGroup }> = ({
  trackGroup,
}) => {
  const [isAddingToCollection, setIsAddingToCollection] = React.useState(false);
  const snackbar = useSnackbar();
  const navigate = useNavigate();
  const { t } = useTranslation("translation", { keyPrefix: "trackGroupCard" });

  const purchaseAlbum = React.useCallback(async () => {
    try {
      const response = await api.post<{}, { redirectUrl: string }>(
        `trackGroups/${trackGroup.id}/purchase`,
        {
          price: 0,
        }
      );
      navigate(response.redirectUrl);
      snackbar(t("success"), { type: "success" });
    } catch (e) {
      snackbar(t("error"), { type: "warning" });
      console.error(e);
    }
  }, [navigate, snackbar, t, trackGroup.id]);

  return (
    <>
      <div
        className={css`
          margin-top: 0rem;
          z-index: 2;
        `}
      >
        <Button
          variant="outlined"
          onClick={() => setIsAddingToCollection(true)}
          className={css`
            font-size: 1rem !important;
          `}
        >
          {t("addToCollection")}
        </Button>
      </div>
      <Modal
        size="small"
        open={isAddingToCollection}
        onClose={() => setIsAddingToCollection(false)}
        title={t("addAlbumToCollection", { title: trackGroup.title }) ?? ""}
      >
        <div
          className={css`
            p {
              margin-bottom: 1rem;
            }
          `}
        >
          <p>{t("addToCollectionDescription")}</p>
          <Button onClick={() => purchaseAlbum()}>
            {t("addToCollection")}
          </Button>
        </div>
      </Modal>
    </>
  );
};

export default AddToCollection;
