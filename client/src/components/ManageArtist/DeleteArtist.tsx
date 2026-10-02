import { css } from "@emotion/css";
import { useQuery } from "@tanstack/react-query";
import { ArtistButton } from "components/Artist/ArtistButtons";
import ConfirmDeleteModal from "components/common/ConfirmDeleteModal";
import { ArtistSection } from "pages/{artistId}/Index";
import { queryManagedArtist, useDeleteArtistMutation } from "queries";
import React from "react";
import { useTranslation } from "react-i18next";
import { AiOutlineWarning } from "react-icons/ai";
import { FaTrash } from "react-icons/fa";
import { useNavigate, useParams } from "react-router-dom";
import { useSnackbar } from "state/SnackbarContext";

import { bp } from "../../constants";

export const DeleteArtist: React.FC = () => {
  const { t } = useTranslation("translation", { keyPrefix: "artistForm" });
  const snackbar = useSnackbar();
  const { artistId } = useParams();
  const { data: artist } = useQuery(queryManagedArtist(Number(artistId)));

  const navigate = useNavigate();

  const { mutate: deleteArtist, isPending: isDeleting } =
    useDeleteArtistMutation();
  const [isConfirming, setIsConfirming] = React.useState(false);

  const onDelete = React.useCallback(() => {
    if (!artist) {
      return;
    }
    deleteArtist(
      { artistId: artist.id, artistSlug: artist.urlSlug ?? "" },
      {
        onSuccess() {
          setIsConfirming(false);
          navigate("/manage");
          snackbar(t("artistDeleted"), { type: "success" });
        },
        onError() {
          snackbar(t("problemDeletingArtist"), { type: "warning" });
        },
      }
    );
  }, [artist, t, deleteArtist, navigate, snackbar]);

  return (
    <ArtistSection
      className={css`
        margin-top: 4rem !important;
        border-top: 1px solid var(--mi-tint-x-color);
        padding-top: 1rem !important;
      `}
    >
      <div>
        <label
          className={css`
            svg {
              margin-bottom: -0.15rem;
              height: 1.2rem;
            }
          `}
        >
          <AiOutlineWarning
            className={css`
              font-size: 1.5rem;
            `}
          />
          {t("terminationDanger")}
        </label>
      </div>
      <div
        className={css`
          padding: 0.5rem 0 2rem 0;

          @media screen and (max-width: ${bp.medium}px) {
            border-radius: 0;
            padding-bottom: 2rem;
          }
        `}
      >
        <ArtistButton
          buttonRole="warning"
          startIcon={<FaTrash />}
          onClick={() => setIsConfirming(true)}
        >
          {t("deleteArtist")}
        </ArtistButton>
      </div>
      {artist && (
        <ConfirmDeleteModal
          open={isConfirming}
          onClose={() => setIsConfirming(false)}
          onConfirm={onDelete}
          title={t("deleteArtistModalTitle", { artist: artist.name })}
          consequences={[
            t("deleteArtistConsequenceMusic"),
            t("deleteArtistConsequenceContent"),
            t("deleteArtistConsequenceSubscribers"),
            t("deleteArtistConsequenceUrl"),
          ]}
          confirmText={artist.name}
          confirmLabel={t("deleteArtist")}
          isDeleting={isDeleting}
        />
      )}
    </ArtistSection>
  );
};

export default DeleteArtist;
