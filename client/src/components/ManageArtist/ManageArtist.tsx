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
import ArtistHeaderSection from "../common/ArtistHeaderSection";
import { useSnackbar } from "state/SnackbarContext";
import { useTranslation } from "react-i18next";
import { useArtistContext } from "state/ArtistContext";

const ManageArtist: React.FC<{}> = () => {
  const { t } = useTranslation("translation", { keyPrefix: "manageArtist" });
  const {
    state: { user },
  } = useGlobalStateContext();
  const snackbar = useSnackbar();
  const navigate = useNavigate();
  const { artistId } = useParams();

  const {
    state: { artist },
    refresh,
  } = useArtistContext();

  const [isEditing, setIsEditing] = React.useState(false);

  const artistBanner = artist?.banner?.sizes;

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

  if (!artist) {
    return null;
  }

  return (
    <div
      className={css`
        filter: drop-shadow(0 0 .5rem rgba(50, 50, 50, .3));
        width: 100%;
        ${user ? "margin-top: calc(16vh);" : "height: ;"}
        ${!user ? "margin-top: calc(16vh);" : "height: ;"}
        ${!artistBanner ? "margin-top: 0px;" : "height: ;"}
        background: var(--mi-light-background-color);
        max-width: calc(1080px + 4rem);

        a {
        }

        @media screen and (max-width: ${bp.medium}px) {
          padding: 0rem !important;
          ${user ? "margin-top: 0px;" : "height: ;"}
          ${!user ? "margin-top: 0px;" : "height: ;"}
          //* ${user ? "margin-top: 240px;" : "height: ;"}
          ${!user ? "margin-top: 240px;" : "height: ;"} *//
        }
      `}
    >
<ArtistHeaderSection artist={artist} />


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
          return refresh();
        }}
      />
      <div
        className={css`
          display: flex;
          width: 100%;
          justify-content: flex-end;
          flex-direction: column;
        `}
      >
        {/*<h1
          className={css`
            flex-grow: 1;
            margin-bottom: 0.25rem;
          `}
        >
          {t("manage", { artist: artist.name })}
        </h1>
        <MarkdownWrapper>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {artist.bio}
          </ReactMarkdown>
        </MarkdownWrapper>
        <div>*/}
        <div
        className={css`
          padding: 0 2rem;

          @media screen and (max-width: ${bp.medium}px) {
            padding: 0rem .5rem 0rem;
          }
        `}
      >
          <Button
            compact
            startIcon={<FaPen />}
            onClick={() => setIsEditing(true)}
            className={css`
              margin-right: 0.5rem;
              margin-top: 1rem;
            `}
          >
            {t("editDetails")}
          </Button>
          <Link to={`/${artist.urlSlug?.toLowerCase() ?? artist.id}`}>
            <Button compact startIcon={<FaEye />}>
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
          padding: .5rem 2rem 2rem 2rem;

          @media screen and (max-width: ${bp.medium}px) {
            border-radius: 0;
            padding: 1rem .5rem 0rem;
          }
        `}
      >
      <Button compact role="warning" startIcon={<FaTrash />} onClick={onDelete}>
        {t("deleteArtist")}
      </Button>
      </div>
    </div>
  );
};

export default ManageArtist;
