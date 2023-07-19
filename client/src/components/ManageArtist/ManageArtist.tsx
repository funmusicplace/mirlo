import { css } from "@emotion/css";
import Button from "components/common/Button";
import React from "react";
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

const ManageArtist: React.FC<{}> = () => {
  const { t } = useTranslation("translation", { keyPrefix: "manageArtist" });
  const {
    state: { user },
  } = useGlobalStateContext();
  const snackbar = useSnackbar();
  const navigate = useNavigate();
  const { artistId } = useParams();
  const [artist, setArtist] = React.useState<Artist>();

  const [isEditing, setIsEditing] = React.useState(false);

  const userId = user?.id;

  React.useEffect(() => {
    const callback = async () => {
      if (userId) {
        const { result } = await api.get<Artist>(
          `users/${userId}/artists/${artistId}`
        );
        setArtist(result);
      }
    };
    callback();
  }, [userId, artistId]);

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

  if (!artist) {
    return null;
  }

  return (
    <div
      className={css`
        margin-bottom: 2rem;
      `}
    >
      {!artist.enabled && (
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
      <ArtistForm
        open={isEditing}
        onClose={() => setIsEditing(false)}
        existing={artist}
        reload={() => {
          return Promise.resolve();
        }}
      />
      <div
        className={css`
          display: flex;
          width: 100%;
          justify-content: flex-end;
          flex-direction: column;
          margin-bottom: 2rem;
        `}
      >
        <h1 style={{ flexGrow: 1 }}>{t("manage", { artist: artist.name })}</h1>
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
          <Link to={`/${artist.urlSlug ?? artist.id}`}>
            <Button compact startIcon={<FaEye />}>
              {t("viewLive")}
            </Button>
          </Link>
        </div>
      </div>
      <ManageArtistAlbums />
      <ManageArtistPosts />
      <ManageArtistSubscriptionTiers />

      <Button
        compact
        color="warning"
        startIcon={<FaTrash />}
        onClick={onDelete}
      >
        {t("deleteArtist")}
      </Button>
    </div>
  );
};

export default ManageArtist;
