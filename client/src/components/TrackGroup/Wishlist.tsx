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

  const [isInWishlist, setIsInWishlist] = React.useState(
    trackGroup.userTrackGroupWishlist?.length !== 0
  );

  const onClick = React.useCallback(async () => {
    setIsInWishlist((val) => !val);
    await api.post(`trackGroups/${trackGroup.id}/wishlist`, {
      wishlist: !isInWishlist,
    });
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
