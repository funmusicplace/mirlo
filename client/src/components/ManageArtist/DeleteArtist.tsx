import React from "react";
import Button from "../common/Button";
import { bp } from "../../constants";
import { css } from "@emotion/css";
import { useSnackbar } from "state/SnackbarContext";
import { useTranslation } from "react-i18next";

import { queryManagedArtist, useDeleteArtistMutation } from "queries";

import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { FaTrash } from "react-icons/fa";

export const DeleteArtist: React.FC = () => {
  const { t } = useTranslation("translation", { keyPrefix: "artistForm" });
  const snackbar = useSnackbar();
  const { artistId } = useParams();
  const { data: artist } = useQuery(queryManagedArtist(Number(artistId)));

  const navigate = useNavigate();

  const { mutate: deleteArtist } = useDeleteArtistMutation();

  const onDelete = React.useCallback(() => {
    if (!!artist && window.confirm(t("areYouSureDelete") ?? "")) {
      deleteArtist(
        { artistId: artist.id, artistSlug: artist.urlSlug ?? "" },
        {
          onSuccess() {
            navigate("/manage");
          },
          onError() {
            snackbar(t("problemDeletingArtist"), { type: "warning" });
          },
        }
      );
    }
  }, [artist, t, deleteArtist, navigate, snackbar]);

  return (
    <div
      className={css`
        padding: 0.5rem 0 2rem 0;

        @media screen and (max-width: ${bp.medium}px) {
          border-radius: 0;
          padding-bottom: 2rem;
        }
      `}
    >
      <Button buttonRole="warning" startIcon={<FaTrash />} onClick={onDelete}>
        {t("deleteArtist")}
      </Button>
    </div>
  );
};

export default DeleteArtist;
