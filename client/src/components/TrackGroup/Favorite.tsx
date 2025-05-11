import Button, { ButtonLink } from "components/common/Button";
import React from "react";
import api from "services/api";
import { useAuthContext } from "state/AuthContext";
import { useTranslation } from "react-i18next";
import { ImStarEmpty, ImStarFull } from "react-icons/im";

const FavoriteTrack: React.FC<{
  track: { id: number };
  collapse?: boolean;
}> = ({ track, collapse }) => {
  const { user } = useAuthContext();
  const { t } = useTranslation("translation", { keyPrefix: "wishlist" });

  const [isInFavorites, setIsInFavorites] = React.useState(
    !!user?.trackFavorites?.find((w) => w.trackId === track.id)
  );

  const onClick = React.useCallback(async () => {
    await api.post(`tracks/${track.id}/favorite`, {
      favorite: !isInFavorites,
    });
    setIsInFavorites((val) => !val);
  }, [isInFavorites, track.id]);

  if (!user) {
    return null;
  }

  const buttonLabel = `${isInFavorites ? t("removeFromFavorites") : t("addToFavorites")}`;

  return (
    <Button
      size="compact"
      variant="transparent"
      onClick={onClick}
      aria-label={buttonLabel}
      className="favorite"
      title={buttonLabel}
      startIcon={isInFavorites ? <ImStarFull /> : <ImStarEmpty />}
    >
      {!collapse && buttonLabel}
    </Button>
  );
};

export default FavoriteTrack;
