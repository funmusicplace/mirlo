import Button from "components/common/Button";
import LogInForm from "components/common/LogInForm";
import Modal from "components/common/Modal";
import React from "react";
import { useTranslation } from "react-i18next";
import { IoIosHeart, IoIosHeartEmpty } from "react-icons/io";
import api from "services/api";
import useErrorHandler from "services/useErrorHandler";
import { useAuthContext } from "state/AuthContext";

const WishlistTrack: React.FC<{
  track: { id: number };
  collapse?: boolean;
}> = ({ track, collapse }) => {
  const { user, refreshLoggedInUser } = useAuthContext();
  const errorHandler = useErrorHandler();
  const { t: tWishlist } = useTranslation("translation", {
    keyPrefix: "wishlist",
  });
  const { t: tLogIn } = useTranslation("translation", { keyPrefix: "logIn" });

  const [isInWishlist, setIsInWishlist] = React.useState(
    !!user?.trackFavorites?.find((w) => w.trackId === track.id)
  );
  const [isLogInModalOpen, setIsLogInModalOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (user === undefined) {
      return;
    }

    if (!user) {
      setIsInWishlist(false);
      return;
    }

    setIsInWishlist(
      !!user.trackFavorites?.find((entry) => entry.trackId === track.id)
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

    const nextState = !isInWishlist;

    try {
      setIsSubmitting(true);
      await api.post(`tracks/${track.id}/favorite`, {
        favorite: nextState,
      });
      setIsInWishlist(nextState);
      refreshLoggedInUser();
    } catch (error) {
      errorHandler(error);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    errorHandler,
    isInWishlist,
    isSubmitting,
    openLoginModal,
    refreshLoggedInUser,
    track.id,
    user,
  ]);

  const buttonLabel = `${
    isInWishlist ? tWishlist("removeFromWishlist") : tWishlist("addToWishlist")
  }`;

  return (
    <>
      <Button
        size="compact"
        variant="transparent"
        onClick={onClick}
        aria-label={buttonLabel}
        className="wishlist"
        title={buttonLabel}
        startIcon={isInWishlist ? <IoIosHeart /> : <IoIosHeartEmpty />}
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

export default WishlistTrack;
