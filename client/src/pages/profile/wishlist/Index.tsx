import { css } from "@emotion/css";
import ArtistTrackGroup from "components/Artist/ArtistTrackGroup";
import Box from "components/common/Box";
import TrackgroupGrid from "components/common/TrackgroupGrid";
import WidthContainer from "components/common/WidthContainer";
import React from "react";
import { useTranslation } from "react-i18next";
import { useAuthContext } from "state/AuthContext";

import api from "services/api";

import FilterGroup from "components/Profile/UserNotificationFeed/FilterGroup";

type Filter = "all" | "albums" | "tracks";

type WishlistItem =
  | {
      kind: "album";
      key: string;
      createdAt: string;
      trackGroup: TrackGroup;
    }
  | {
      kind: "track";
      key: string;
      createdAt: string;
      trackGroup: TrackGroup;
      track: Track;
    };

function Index() {
  const { user } = useAuthContext();
  const userId = user?.id;
  const { t } = useTranslation("translation", { keyPrefix: "profile" });

  const [wishlisted, setWishlisted] =
    React.useState<UserTrackGroupWishlist[]>();
  const [filter, setFilter] = React.useState<Filter>("all");

  const fetchWishlist = React.useCallback(async () => {
    const { results } = await api.getMany<UserTrackGroupWishlist>(
      `users/${userId}/wishlist`
    );
    setWishlisted(results);
  }, [userId]);

  React.useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  const items = React.useMemo<WishlistItem[]>(() => {
    const albums: WishlistItem[] = (wishlisted ?? [])
      .filter((w) => w.trackGroup)
      .map((w) => ({
        kind: "album",
        key: `album-${w.trackGroupId}`,
        createdAt: w.createdAt,
        trackGroup: w.trackGroup,
      }));
    const tracks: WishlistItem[] = (user?.trackFavorites ?? []).map((tf) => ({
      kind: "track",
      key: `track-${tf.trackId}`,
      createdAt: tf.createdAt,
      trackGroup: { ...tf.track.trackGroup, tracks: [tf.track] },
      track: tf.track,
    }));
    return [...albums, ...tracks].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [wishlisted, user?.trackFavorites]);

  const filtered = React.useMemo(() => {
    if (filter === "albums") return items.filter((i) => i.kind === "album");
    if (filter === "tracks") return items.filter((i) => i.kind === "track");
    return items;
  }, [items, filter]);

  if (!user) {
    return null;
  }

  return (
    <div
      className={css`
        padding: var(--mi-side-paddings-xsmall);
      `}
    >
      <WidthContainer variant="big" justify="center">
        <h1>{t("yourWishlist")}</h1>
        <FilterGroup
          legend={t("wishlistFilterLegend")}
          name="wishlist-filter"
          options={[
            { value: "all", label: t("wishlistFilterAll") },
            { value: "albums", label: t("wishlistFilterAlbums") },
            { value: "tracks", label: t("wishlistFilterTracks") },
          ]}
          value={filter}
          onChange={(value) => setFilter(value as Filter)}
        />
        <div
          className={css`
            display: flex;
            width: 100%;
            flex-direction: row;
            flex-wrap: wrap;
          `}
        >
          {filtered.length === 0 && <Box>{t("wishlistEmpty")}</Box>}
          <TrackgroupGrid gridNumber="6">
            {filtered.map((item) => (
              <ArtistTrackGroup
                key={item.key}
                trackGroup={item.trackGroup}
                track={item.kind === "track" ? item.track : undefined}
                showTrackWishlist={item.kind === "track"}
                showArtist
              />
            ))}
          </TrackgroupGrid>
        </div>
      </WidthContainer>
    </div>
  );
}

export default Index;
