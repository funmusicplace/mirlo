import { css } from "@emotion/css";
import Button from "components/common/Button";
import Modal from "components/common/Modal";
import React from "react";
import { useTranslation } from "react-i18next";
import { useSnackbar } from "state/SnackbarContext";
import api from "services/api";
import { useNavigate } from "react-router-dom";
import { ArtistButton } from "components/Artist/ArtistButtons";
import { IoAddSharp } from "react-icons/io5";
import { FixedButton } from "components/common/FixedButton";
import { bp } from "../../constants";

const AddToCollection: React.FC<{
  trackGroup: TrackGroup;
  fixed?: boolean;
}> = ({ trackGroup, fixed }) => {
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
      {fixed ? (
        <FixedButton
          rounded
          onClick={() => purchaseAlbum()}
          startIcon={<IoAddSharp />}
        >
          {t("addToCollection")}
        </FixedButton>
      ) : (
        <ArtistButton
          variant="outlined"
          onClick={() => purchaseAlbum()}
          className={css`
            font-size: 1rem !important;

            .children {
              overflow: hidden;
              text-overflow: ellipsis;
            }

            @media screen and (max-width: ${bp.medium}px) {
              width: 100%;
            }
          `}
          startIcon={<IoAddSharp />}
        >
          {t("addToCollection")}
        </ArtistButton>
      )}
    </>
  );
};

export default AddToCollection;
