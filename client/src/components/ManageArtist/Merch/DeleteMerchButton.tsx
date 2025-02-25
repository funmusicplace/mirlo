import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { css } from "@emotion/css";
import { useQuery } from "@tanstack/react-query";
import { queryManagedMerch, useDeleteMerchMutation } from "queries";

import { FaTrash } from "react-icons/fa";
import { useSnackbar } from "state/SnackbarContext";
import { ArtistButton } from "components/Artist/ArtistButtons";

export interface TrackGroupFormData {
  published: boolean;
  title: string;
  type: TrackGroup["type"];
  minPrice: string;
  releaseDate: string;
  credits: string;
  about: string;
  coverFile: File[];
}

const DeleteMerch: React.FC<{}> = () => {
  const { t } = useTranslation("translation", { keyPrefix: "manageMerch" });
  const snackbar = useSnackbar();
  const navigate = useNavigate();
  const { merchId: merchParamId } = useParams();

  const { data: merch, refetch } = useQuery(
    queryManagedMerch(merchParamId ?? "")
  );

  const { mutate: deleteMerch, isPending } = useDeleteMerchMutation();

  const onDelete = React.useCallback(() => {
    if (!!merch && window.confirm(t("areYouSureDelete") ?? "")) {
      deleteMerch(
        { merchId: merch.id },
        {
          onSuccess() {
            refetch();
            navigate(`/manage/artists/${merch.artistId}/merch`);
          },
          onError() {
            snackbar(t("problemDeletingMerch"), { type: "warning" });
          },
        }
      );
    }
  }, [merch, t, deleteMerch, navigate, snackbar]);

  return (
    <div
      className={css`
        margin-top: 2rem;
        padding-top: 2rem;
        width: 100%;
        border-top: 1px solid var(--mi-darken-x-background-color);
      `}
    >
      <ArtistButton
        size="compact"
        className={css`
          background-color: var(--mi-alert);
        `}
        buttonRole="warning"
        isLoading={isPending}
        startIcon={<FaTrash />}
        onClick={onDelete}
      >
        {t("deleteMerch")}
      </ArtistButton>
    </div>
  );
};

export default DeleteMerch;
