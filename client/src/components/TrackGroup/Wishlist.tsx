import { css } from "@emotion/css";
import IconButton from "components/common/IconButton";
import React from "react";
import { IoIosHeart, IoIosHeartEmpty } from "react-icons/io";
import api from "services/api";
import { useGlobalStateContext } from "state/GlobalState";

const Wishlist: React.FC<{ trackGroup: TrackGroup }> = ({ trackGroup }) => {
  const {
    state: { user },
  } = useGlobalStateContext();
  // console.log("trackGroup", user);

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
    <IconButton
      onClick={onClick}
      compact
      variant="link"
      className={css`
        color: inherit !important;
      `}
    >
      {isInWishlist ? <IoIosHeart /> : <IoIosHeartEmpty />}
    </IconButton>
  );
};

export default Wishlist;
