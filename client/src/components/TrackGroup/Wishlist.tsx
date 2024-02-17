import { css } from "@emotion/css";
import Button from "components/common/Button";
import React from "react";
import { IoIosHeart, IoIosHeartEmpty } from "react-icons/io";
import api from "services/api";
import { useGlobalStateContext } from "state/GlobalState";

const Wishlist: React.FC<{ trackGroup: TrackGroup }> = ({ trackGroup }) => {
  const {
    state: { user },
  } = useGlobalStateContext();

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

  return (
    <Button
      onClick={onClick}
      compact
      variant="link"
      className={css`
        color: inherit !important;
      `}
      startIcon={isInWishlist ? <IoIosHeart /> : <IoIosHeartEmpty />}
    />
  );
};

export default Wishlist;
