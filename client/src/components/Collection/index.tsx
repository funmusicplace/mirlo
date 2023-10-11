import { css } from "@emotion/css";
import ArtistTrackGroup from "components/Artist/ArtistTrackGroup";
import Box from "components/common/Box";
import React from "react";
import api from "../../services/api";
import { useGlobalStateContext } from "../../state/GlobalState";

function Profile() {
  const {
    state: { user },
  } = useGlobalStateContext();
  const userId = user?.id;

  const [purchases, setPurchases] = React.useState<UserTrackGroupPurchase[]>();

  const fetchTrackGroups = React.useCallback(async () => {
    const { results } = await api.getMany<UserTrackGroupPurchase>(
      `users/${userId}/purchases`
    );
    setPurchases(results);
  }, [userId]);

  React.useEffect(() => {
    fetchTrackGroups();
  }, [fetchTrackGroups]);

  if (!user) {
    return null;
  }

  return (
    <div
      className={css`
        display: flex;
        flex-direction: column;
      `}
    >
      {!purchases ||
        (purchases?.length === 0 && (
          <Box>
            There's nothing in your collection yet, support some artists and buy
            their music!
          </Box>
        ))}
      {purchases?.map(
        (purchase) =>
          purchase.trackGroup && (
            <ArtistTrackGroup
              trackGroup={purchase.trackGroup}
              key={purchase.trackGroupId}
            />
          )
      )}
    </div>
  );
}

export default Profile;
