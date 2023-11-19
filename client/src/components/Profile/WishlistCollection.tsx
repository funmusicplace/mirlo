import { css } from "@emotion/css";
import ArtistTrackGroup from "components/Artist/ArtistTrackGroup";
import Box from "components/common/Box";
import React from "react";
import api from "../../services/api";
import { useGlobalStateContext } from "../../state/GlobalState";
import { useTranslation } from "react-i18next";

function WishlistCollection() {
  const {
    state: { user },
  } = useGlobalStateContext();
  const userId = user?.id;

  const [purchases, setPurchases] = React.useState<UserTrackGroupPurchase[]>();
  const { t } = useTranslation("translation", { keyPrefix: "profile" });

  const fetchTrackGroups = React.useCallback(async () => {
    const { results } = await api.getMany<UserTrackGroupPurchase>(
      `users/${userId}/wishlist`
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
    <>
      <div>
        <h1>{t("yourCollection")}</h1>
        <div
          className={css`
            display: flex;
            width: 100%;
            flex-direction: row;
            flex-wrap: wrap;
          `}
        >
          {!purchases ||
            (purchases?.length === 0 && <Box>{t("collectionEmpty")}</Box>)}
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
      </div>
    </>
  );
}

export default WishlistCollection;
