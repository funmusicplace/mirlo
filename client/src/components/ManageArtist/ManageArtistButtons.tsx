import { css } from "@emotion/css";
import React from "react";
import { useLocation, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FaEye, FaPen } from "react-icons/fa";
import { bp } from "../../constants";
import { useQuery } from "@tanstack/react-query";
import { queryArtist } from "queries";
import { useAuthContext } from "state/AuthContext";
import FixedButtonLink from "components/common/FixedButton";

const ManageArtistButtons: React.FC = () => {
  const { t } = useTranslation("translation", { keyPrefix: "manageArtist" });
  const { pathname } = useLocation();
  const { artistId, trackGroupId } = useParams();
  const isManagePage = pathname.includes("/manage/artists");
  const { data: artist, isLoading: isArtistLoading } = useQuery(
    queryArtist({ artistSlug: artistId ?? "" })
  );
  const { user } = useAuthContext();

  return (
    <>
      {artist &&
        (user?.isAdmin ||
          (artist && user?.id === artist?.userId && !trackGroupId)) && (
          <div
            className={css`
              z-index: 999999;
              top: 75px;
              right: 1rem;
              position: fixed;
              display: flex;
              flex-direction: column;
              a {
                margin-bottom: 0.5rem;
              }

              @media screen and (max-width: ${bp.medium}px) {
                left: 1rem;
                bottom: 75px;
                top: auto;
                right: auto;
              }
            `}
          >
            <FixedButtonLink
              to={`/manage/artists/${artist.id}/customize`}
              startIcon={<FaEye />}
              size="compact"
              variant="dashed"
            >
              {t("customizeLook")}
            </FixedButtonLink>
            {!isManagePage && (
              <FixedButtonLink
                to={`/manage/artists/${artist.id}`}
                startIcon={<FaPen />}
                size="compact"
                variant="dashed"
              >
                {t("editPage")}
              </FixedButtonLink>
            )}
            <FixedButtonLink
              to={`/${artist?.urlSlug?.toLowerCase() ?? artist?.id}`}
              startIcon={<FaEye />}
              disabled={!artist}
              variant="dashed"
              size="compact"
            >
              {t("viewLive")}
            </FixedButtonLink>
          </div>
        )}
    </>
  );
};

export default ManageArtistButtons;
