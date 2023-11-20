import { css } from "@emotion/css";
import Button from "components/common/Button";
import React from "react";
import { bp } from "../../constants";
import { FaEye, FaPen, FaTrash } from "react-icons/fa";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "services/api";
import { useGlobalStateContext } from "state/GlobalState";
import ArtistForm from "./ArtistForm";
import ManageArtistPosts from "./ManageArtistPosts";
import ManageArtistAlbums from "./ManageArtistAlbums";
import ManageArtistSubscriptionTiers from "./ManageArtistSubscriptionTiers";
import { useSnackbar } from "state/SnackbarContext";
import { useTranslation } from "react-i18next";
import { useArtistContext } from "state/ArtistContext";
import Box from "components/common/Box";

const ManageArtist: React.FC<{}> = () => {
  const { t } = useTranslation("translation", { keyPrefix: "manageArtist" });
  const {
    state: { user },
  } = useGlobalStateContext();
  const snackbar = useSnackbar();
  const navigate = useNavigate();
  const { artistId } = useParams();

  const {
    refresh,
    state: { artist, isLoading },
  } = useArtistContext();

  const [isEditing, setIsEditing] = React.useState(false);

  const userId = user?.id;

  const onDelete = async () => {
    try {
      if (window.confirm("Are you sure you want to delete this artist?")) {
        await api.delete(`users/${userId}/artists/${artistId}`);
        navigate("/manage");
      }
    } catch (e) {
      snackbar("Problem deleting artist", { type: "warning" });
    }
  };

  if (!artist && !isLoading) {
    return <Box>{t("doesNotExist")}</Box>;
  }

  return (
    <>
      {artist && !artist.enabled && (
        <div
          className={css`
            background-color: var(--mi-warning-background-color);
            padding: 1rem;
            color: var(--mi-warning-text-color);
          `}
        >
          {t("notEnabled")}
        </div>
      )}

      {artist && (
        <ArtistForm
          open={isEditing}
          onClose={() => setIsEditing(false)}
          existing={artist}
          reload={() => {
            return refresh();
          }}
        />
      )}
      <div
        className={css`
          display: flex;
          width: 100%;
          justify-content: flex-end;
          flex-direction: column;

          @media screen and (max-width: ${bp.medium}px) {
            padding: var(--mi-side-paddings-xsmall);
            padding-top: 0.5rem;
            padding-bottom: 0.5rem;
        `}
      >
        <div>
          <Button
            compact
            startIcon={<FaPen />}
            onClick={() => setIsEditing(true)}
            className={css`
              margin-right: 0.5rem;
            `}
          >
            {t("editDetails")}
          </Button>
          <Link to={`/${artist?.urlSlug?.toLowerCase() ?? artist?.id}`}>
            <Button compact startIcon={<FaEye />} disabled={!artist}>
              {t("viewLive")}
            </Button>
          </Link>
        </div>
      </div>
      <ManageArtistAlbums />
      <ManageArtistPosts />
      <ManageArtistSubscriptionTiers />
      <div
        className={css`
          padding: 0.5rem 0 2rem 0;

          @media screen and (max-width: ${bp.medium}px) {
            border-radius: 0;
            padding-top: 1rem;
            padding: var(--mi-side-paddings-xsmall);
            > div > div {
              padding: 2rem;
            }
          }
        `}
      >
        <Button
          compact
          role="warning"
          startIcon={<FaTrash />}
          onClick={onDelete}
        >
          {t("deleteArtist")}
        </Button>
      </div>
    </>
  );
};

export default ManageArtist;
