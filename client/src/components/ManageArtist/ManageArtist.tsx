import { css } from "@emotion/css";
import Button from "components/common/Button";
import React from "react";
import { bp } from "../../constants";
import { FaEye, FaPen, FaTrash } from "react-icons/fa";
import {
  Link,
  NavLink,
  Outlet,
  useNavigate,
  useParams,
} from "react-router-dom";
import ArtistForm from "./ArtistForm";
import { useSnackbar } from "state/SnackbarContext";
import { useTranslation } from "react-i18next";
import Box from "components/common/Box";
import { ArtistTabs } from "components/common/Tabs";
import { ArtistSection } from "components/Artist/Artist";
import styled from "@emotion/styled";
import { useQuery } from "@tanstack/react-query";
import { queryManagedArtist, useDeleteArtistMutation } from "queries";
import { useAuthContext } from "state/AuthContext";

export const MainButtons = styled.div`
  display: flex;
  width: 100%;
  justify-content: flex-end;
  flex-direction: column;
  margin-bottom: 1rem;

  @media screen and (max-width: ${bp.medium}px) {
    padding: var(--mi-side-paddings-xsmall);
    padding-top: 0.5rem;
    margin-bottom: 0;
  }
`;

const ManageArtist: React.FC<{}> = () => {
  const { t } = useTranslation("translation", { keyPrefix: "manageArtist" });
  const snackbar = useSnackbar();
  const navigate = useNavigate();
  const { artistId } = useParams();

  const { user } = useAuthContext();
  const userId = user?.id;

  const { data: artist, isError } = useQuery(queryManagedArtist(Number(userId), Number(artistId)));

  const { mutate: deleteArtist } = useDeleteArtistMutation();

  const [isEditing, setIsEditing] = React.useState(false);

  const onDelete = React.useCallback(() => {
    if (!!userId && !!artist && window.confirm("Are you sure you want to delete this artist?")) {
      deleteArtist(
        { userId, artistId: artist.id, artistSlug: artist.urlSlug ?? "" },
        {
          onSuccess() {
            navigate("/manage");
          },
          onError() {
            snackbar("Problem deleting artist", { type: "warning" });
          },
        }
      );
    }
  }, [userId, artist, deleteArtist, navigate, snackbar]);

  if (isError) {
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
        />
      )}
      <MainButtons>
        <div>
          <Button
            variant="big"
            startIcon={<FaPen />}
            onClick={() => setIsEditing(true)}
            className={css`
              margin-right: 0.5rem;
              margin-bottom: 0.25rem;
            `}
          >
            {t("editDetails")}
          </Button>
          <Link to={`/${artist?.urlSlug?.toLowerCase() ?? artist?.id}`}>
            <Button variant="big" startIcon={<FaEye />} disabled={!artist}>
              {t("viewLive")}
            </Button>
          </Link>
        </div>
      </MainButtons>
      <ArtistTabs>
        <li>
          <NavLink to="releases">{t("yourAlbums")}</NavLink>
        </li>
        <li>
          <NavLink to="posts">{t("posts")}</NavLink>
        </li>
        {artist && (
          <li>
            <NavLink to="tiers">{t("tiers", { artist: artist.name })}</NavLink>
          </li>
        )}
      </ArtistTabs>
      <Outlet />

      <ArtistSection>
        <div>
          <h2>Danger</h2>
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
          <Button
            compact
            role="warning"
            startIcon={<FaTrash />}
            onClick={onDelete}
          >
            {t("deleteArtist")}
          </Button>
        </div>
      </ArtistSection>
    </>
  );
};

export default ManageArtist;
