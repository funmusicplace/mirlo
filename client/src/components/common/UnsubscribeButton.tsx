import { useAuthContext } from "state/AuthContext";
import Button from "./Button";
import React from "react";
import { useSnackbar } from "state/SnackbarContext";
import { useTranslation } from "react-i18next";

import api from "services/api";
import { css } from "@emotion/css";

import useErrorHandler from "services/useErrorHandler";
import { ArtistButton } from "components/Artist/ArtistButtons";

const UnsubscribeButton: React.FC<{
  artist: Pick<Artist, "id" | "name" | "userId" | "urlSlug">;
  onFinishedSubscribing?: (val: boolean) => void;
}> = ({ artist, onFinishedSubscribing }) => {
  const { t } = useTranslation("translation", { keyPrefix: "artist" });

  const { refreshLoggedInUser } = useAuthContext();

  const [isRemovingSubscription, setIsRemovingSubscription] =
    React.useState(false);
  const snackbar = useSnackbar();
  const errorHandler = useErrorHandler();

  const unsubscribeFromArtist = async () => {
    try {
      setIsRemovingSubscription(true);
      await api.delete(`artists/${artist.id}/subscribe`);
      snackbar(t("unsubscribedFromArtist"), { type: "success" });
    } catch (e) {
      errorHandler(e);
    } finally {
      setIsRemovingSubscription(false);
      refreshLoggedInUser();
      onFinishedSubscribing?.(false);
    }
  };

  return (
    <ArtistButton
      onClick={() => unsubscribeFromArtist()}
      isLoading={isRemovingSubscription}
      wrap
      className={css`
        width: 100% !important;
        margin-top: 1rem;
      `}
    >
      {t("unsubscribeFromArtist", { artistName: artist.name })}
    </ArtistButton>
  );
};

export default UnsubscribeButton;
