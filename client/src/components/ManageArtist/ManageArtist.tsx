import { css } from "@emotion/css";
import Button, { ButtonLink } from "components/common/Button";
import React from "react";
import { bp } from "../../constants";
import { FaEye, FaPen, FaTrash } from "react-icons/fa";
import { NavLink, Outlet, useNavigate, useParams } from "react-router-dom";
import { useSnackbar } from "state/SnackbarContext";
import { useTranslation } from "react-i18next";
import Box from "components/common/Box";
import { ArtistTabs } from "components/common/Tabs";
import { ArtistSection } from "components/Artist/Artist";
import styled from "@emotion/styled";
import { useQuery } from "@tanstack/react-query";
import { queryManagedArtist, useDeleteArtistMutation } from "queries";
import { AiOutlineWarning } from "react-icons/ai";

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

  const { data: artist, isError } = useQuery(
    queryManagedArtist(Number(artistId))
  );

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

  if (isError) {
    return <Box>{t("doesNotExist")}</Box>;
  }

  if (!artist) {
    return null;
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

      <MainButtons>
        <div>
          <ButtonLink
            variant="big"
            startIcon={<FaPen />}
            to={`/manage/artists/${artist.id}/customize`}
            className={css`
              margin-right: 0.5rem;
              margin-bottom: 0.25rem;
            `}
          >
            {t("editDetails")}
          </ButtonLink>
          <ButtonLink
            to={`/${artist?.urlSlug?.toLowerCase() ?? artist?.id}`}
            variant="big"
            startIcon={<FaEye />}
            disabled={!artist}
          >
            {t("viewLive")}
          </ButtonLink>
        </div>
      </MainButtons>
      <ArtistTabs>
        <li>
          <NavLink to="releases">{t("releases")}</NavLink>
        </li>
        <li>
          <NavLink to="posts">{t("updates")}</NavLink>
        </li>
        {artist && (
          <li>
            <NavLink to="tiers">
              {t("support", { artist: artist.name })}
            </NavLink>
          </li>
        )}
      </ArtistTabs>
      <Outlet />

      <ArtistSection>
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
          <Button
            compact
            buttonRole="warning"
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
