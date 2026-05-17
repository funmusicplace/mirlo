import { ArtistButton } from "components/Artist/ArtistButtons";
import Button from "components/common/Button";
import { FixedButton } from "components/common/FixedButton";
import React from "react";
import { useTranslation } from "react-i18next";
import { IoIosHeart, IoIosHeartEmpty } from "react-icons/io";
import api from "services/api";
import { useAuthContext } from "state/AuthContext";

const Wishlist: React.FC<{
  trackGroup: { id: number };
  inArtistPage?: boolean;
  fixed?: boolean;
}> = ({ trackGroup, inArtistPage, fixed }) => {
  const { user } = useAuthContext();
  const { t } = useTranslation("translation", { keyPrefix: "wishlist" });

  const [isInWishlist, setIsInWishlist] = React.useState(
    !!user?.wishlist?.find((w) => w.trackGroupId === trackGroup.id)
  );

  const onClick = React.useCallback(async () => {
    await api.post(`trackGroups/${trackGroup.id}/wishlist`, {
      wishlist: !isInWishlist,
    });
    setIsInWishlist((val) => !val);
  }, [isInWishlist, trackGroup.id]);

  if (!user) {
    return null;
  }

  const buttonLabel = `${isInWishlist ? t("removeFromWishlist") : t("addToWishlist")}`;

  if (fixed) {
    return (
      <FixedButton
        onClick={onClick}
        aria-label={buttonLabel}
        className="wishlist max-md:justify-center!"
        title={buttonLabel}
        rounded
        size="compact"
        endIcon={isInWishlist ? <IoIosHeart /> : <IoIosHeartEmpty />}
      />
    );
  }

  if (inArtistPage) {
    return (
      <ArtistButton
        onClick={onClick}
        aria-label={buttonLabel}
        className="wishlist"
        title={buttonLabel}
        startIcon={isInWishlist ? <IoIosHeart /> : <IoIosHeartEmpty />}
      />
    );
  }

  return (
    <Button
      onClick={onClick}
      aria-label={buttonLabel}
      className="wishlist"
      title={buttonLabel}
      startIcon={isInWishlist ? <IoIosHeart /> : <IoIosHeartEmpty />}
    />
  );
};

export default Wishlist;
