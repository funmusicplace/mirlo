import { css } from "@emotion/css";
import ArtistTrackGroup from "components/Artist/ArtistTrackGroup";
import Box from "components/common/Box";
import TrackgroupGrid from "components/common/TrackgroupGrid";
import React from "react";
import api from "../../services/api";
import { useTranslation } from "react-i18next";
import WidthContainer from "components/common/WidthContainer";
import { useAuthContext } from "state/AuthContext";

function WishlistCollection() {
  const { user } = useAuthContext();
  const userId = user?.id;
  const { t } = useTranslation("translation", { keyPrefix: "profile" });

  const [wishlisted, setWishlisted] =
    React.useState<UserTrackGroupWishlist[]>();

  const fetchWishlist = React.useCallback(async () => {
    const { results } = await api.getMany<UserTrackGroupWishlist>(
      `users/${userId}/wishlist`
    );
    setWishlisted(results);
  }, [userId]);

  React.useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  if (!user) {
    return null;
  }

  return (
    <>
      <div
        className={css`
          padding: var(--mi-side-paddings-xsmall);
        `}
      >
        <WidthContainer variant="big" justify="center">
          <h1>{t("yourWishlist")}</h1>
          <div
            className={css`
              display: flex;
              width: 100%;
              flex-direction: row;
              flex-wrap: wrap;
            `}
          >
            {!wishlisted ||
              (wishlisted?.length === 0 && <Box>{t("wishlistEmpty")}</Box>)}
            <TrackgroupGrid gridNumber="6">
              {wishlisted?.map(
                (wishlist) =>
                  wishlist.trackGroup && (
                    <ArtistTrackGroup
                      trackGroup={wishlist.trackGroup}
                      key={wishlist.trackGroupId}
                      showArtist
                    />
                  )
              )}
            </TrackgroupGrid>
          </div>
        </WidthContainer>
        <WidthContainer variant="big" justify="center">
          <h1>{t("favoritedTracks")}</h1>
          <div
            className={css`
              display: flex;
              width: 100%;
              flex-direction: row;
              flex-wrap: wrap;
            `}
          >
            {!user?.trackFavorites ||
              (user?.trackFavorites?.length === 0 && (
                <Box>{t("wishlistEmpty")}</Box>
              ))}
            <TrackgroupGrid gridNumber="6">
              {user?.trackFavorites?.map((tf) => (
                <ArtistTrackGroup
                  trackGroup={{ ...tf.track.trackGroup, tracks: [tf.track] }}
                  key={tf.trackId}
                  showTrackFavorite
                  showArtist
                />
              ))}
            </TrackgroupGrid>
          </div>
        </WidthContainer>
      </div>
    </>
  );
}

export default WishlistCollection;
