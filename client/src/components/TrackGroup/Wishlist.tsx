import { css } from "@emotion/css";
import Button from "components/common/Button";
import { bp } from "../../constants";
import React from "react";
import { IoIosHeart, IoIosHeartEmpty } from "react-icons/io";
import api from "services/api";
import { useAuthContext } from "state/AuthContext";
import { useTranslation } from "react-i18next";

const Wishlist: React.FC<{ trackGroup: { id: number } }> = ({ trackGroup }) => {
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

  return (
    <Button
      onClick={onClick}
      className={css`
        color: inherit !important;
        :hover {
          border: solid 1px black !important;
          background-color: transparent !important;
        }
        span {
          font-size: 1.1rem !important;
        }
        @media screen and (max-width: ${bp.small}px) {
          span {
            font-size: 1rem !important;
          }
        }
      `}
      aria-label={buttonLabel}
      title={buttonLabel}
      startIcon={isInWishlist ? <IoIosHeart /> : <IoIosHeartEmpty />}
    />
  );
};

export default Wishlist;
