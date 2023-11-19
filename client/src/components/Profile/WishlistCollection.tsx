import { bp } from "../../constants";
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
      <div 
        className={css`
            padding: 0rem 0.5rem;
          `}>
        <h1>{t("yourWishlist")}</h1>
        <div
          className={css`
            display: flex;
            width: 100%;
            flex-direction: row;
            flex-wrap: wrap;
          `}
        >    <div
              className={css`
                display: flex;
                width: 100%;
                flex-direction: row;
                flex-wrap: wrap;
                a:first-child {
                  font-size: .9rem;
                }
                a:last-child {
                  font-size: .8rem;
                }

                > div {
                  flex: 24%;
                  max-width: 24%;
                  margin-left: 0rem;
                  margin-right: 1%;
                  padding: 0 !important;

                  :nth-child(4n) {
                  margin-left: 0rem;
                  }

                  @media screen and (max-width: ${bp.medium}px) {

                    a:first-child {
                      font-size: .7rem;
                    }
                    a:last-child {
                      font-size: .6rem;
                    }

                    max-width: 32%;
                    flex: 32%;
                    margin-right: 2%;

                    :nth-child(3n) {
                      border-top: 0;
                      margin-left: 0rem;
                      margin-right: 0rem;
                    }
                  }

                  @media screen and (max-width: ${bp.small}px) {

                    max-width: 48.5%;
                    flex: 48.5%;
                    margin-bottom: 0.5rem;
                    margin-top: 0.5rem;

                    &:nth-child(odd) {
                      margin-left: 0rem;
                      margin-right: 1.5%;
                    }

                    &:nth-child(even) {
                      margin-right: 0rem;
                      margin-left: 1.5%;
                    }
                }
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
      </div>
    </>
  );
}

export default WishlistCollection;
