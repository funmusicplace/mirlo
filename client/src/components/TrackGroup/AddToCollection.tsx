import { css } from "@emotion/css";
import { ArtistButton } from "components/Artist/ArtistButtons";
import { FixedButton } from "components/common/FixedButton";
import { usePurchase } from "components/common/Purchase/usePurchase";
import React from "react";
import { Trans, useTranslation } from "react-i18next";
import { IoAddSharp } from "react-icons/io5";
import { Link } from "react-router-dom";
import { useAuthContext } from "state/AuthContext";
import { useSnackbar } from "state/SnackbarContext";

import { bp } from "../../constants";

const AddToCollection: React.FC<{
  trackGroup: TrackGroup;
  track?: Track;
  fixed?: boolean;
}> = ({ trackGroup, track, fixed }) => {
  const snackbar = useSnackbar();
  const { user } = useAuthContext();
  const { t } = useTranslation("translation", { keyPrefix: "trackGroupCard" });
  const isLoggedOut = !user;
  const { isLoading, startPurchase } = usePurchase();

  const purchaseAlbum = React.useCallback(async () => {
    try {
      await startPurchase({
        artistId: trackGroup.artistId ?? trackGroup.artist.id,
        items: [
          {
            type: track ? "track" : "trackGroup",
            id: track ? track.id : trackGroup.id,
            price: "0",
          },
        ],
      });
      snackbar(t("success"), { type: "success" });
    } catch (e) {
      snackbar(t("error"), { type: "warning" });
      console.error(e);
    }
  }, [snackbar, t, trackGroup, track, startPurchase]);

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
          isLoading={isLoading}
        >
          {t("addToCollection")}
        </FixedButton>
      ) : (
        <ArtistButton
          variant="outlined"
          disabled={isLoggedOut}
          onClick={() => purchaseAlbum()}
          isLoading={isLoading}
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
