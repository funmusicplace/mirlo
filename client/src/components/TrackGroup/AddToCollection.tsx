import { css } from "@emotion/css";
import { ArtistButton } from "components/Artist/ArtistButtons";
import { FixedButton } from "components/common/FixedButton";
import React from "react";
import { Trans, useTranslation } from "react-i18next";
import { IoAddSharp } from "react-icons/io5";
import { Link, useNavigate } from "react-router-dom";
import api from "services/api";
import { useAuthContext } from "state/AuthContext";
import { useSnackbar } from "state/SnackbarContext";

import { bp } from "../../constants";

const AddToCollection: React.FC<{
  trackGroup: TrackGroup;
  fixed?: boolean;
}> = ({ trackGroup, fixed }) => {
  const snackbar = useSnackbar();
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const { t } = useTranslation("translation", { keyPrefix: "trackGroupCard" });
  const isLoggedOut = !user;

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
      {isLoggedOut && (
        <p className="mb-2 text-sm text-(--mi-light-foreground-color)">
          <Trans
            t={t}
            i18nKey="addToCollectionLoggedOut"
            components={{
              signupLink: <Link to="/signup" className="underline" />,
            }}
          />
        </p>
      )}
      {fixed ? (
        <FixedButton
          rounded
          disabled={isLoggedOut}
          onClick={() => purchaseAlbum()}
          startIcon={<IoAddSharp />}
        >
          {t("addToCollection")}
        </FixedButton>
      ) : (
        <ArtistButton
          variant="outlined"
          disabled={isLoggedOut}
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
