import Button from "components/common/Button";
import LogInForm from "components/common/LogInForm";
import Modal from "components/common/Modal";
import React from "react";
import { useTranslation } from "react-i18next";
import { ImStarEmpty, ImStarFull } from "react-icons/im";
import api from "services/api";
import useErrorHandler from "services/useErrorHandler";
import { useAuthContext } from "state/AuthContext";

const FavoriteTrack: React.FC<{
  track: { id: number };
  collapse?: boolean;
}> = ({ track, collapse }) => {
  const { user, refreshLoggedInUser } = useAuthContext();
  const errorHandler = useErrorHandler();
  const { t: tWishlist } = useTranslation("translation", {
    keyPrefix: "wishlist",
  });
  const { t: tLogIn } = useTranslation("translation", { keyPrefix: "logIn" });

  const [isInFavorites, setIsInFavorites] = React.useState(
    !!user?.trackFavorites?.find((w) => w.trackId === track.id)
  );
  const [isLogInModalOpen, setIsLogInModalOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (user === undefined) {
      return;
    }

    if (!user) {
      setIsInFavorites(false);
      return;
    }

    setIsInFavorites(
      !!user.trackFavorites?.find((favorite) => favorite.trackId === track.id)
    );
  }, [track.id, user]);

  const openLoginModal = React.useCallback(() => {
    setIsLogInModalOpen(true);
  }, []);

  const closeLoginModal = React.useCallback(() => {
    setIsLogInModalOpen(false);
  }, []);

  const onClick = React.useCallback(async () => {
    if (user === undefined || isSubmitting) {
      return;
    }

    if (!user) {
      openLoginModal();
      return;
    }

    const nextFavoriteState = !isInFavorites;

    try {
      setIsSubmitting(true);
      await api.post(`tracks/${track.id}/favorite`, {
        favorite: nextFavoriteState,
      });
      setIsInFavorites(nextFavoriteState);
      refreshLoggedInUser();
    } catch (error) {
      errorHandler(error);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    errorHandler,
    isInFavorites,
    isSubmitting,
    openLoginModal,
    refreshLoggedInUser,
    track.id,
    user,
  ]);

  const buttonLabel = `${
    isInFavorites ? tWishlist("removeFromFavorites") : tWishlist("addToFavorites")
  }`;

  return (
    <>
      <Button
        size="compact"
        variant="transparent"
        onClick={onClick}
        aria-label={buttonLabel}
        className="favorite"
        title={buttonLabel}
        startIcon={isInFavorites ? <ImStarFull /> : <ImStarEmpty />}
        disabled={user === undefined || isSubmitting}
      >
        {!collapse && buttonLabel}
      </Button>

      {!user && (
        <Modal
          open={isLogInModalOpen}
          onClose={closeLoginModal}
          size="small"
          title={tLogIn("logIn") ?? ""}
        >
          <LogInForm afterLogIn={closeLoginModal} />
        </Modal>
      )}
    </>
  );
};

export default FavoriteTrack;
