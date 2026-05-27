import { css } from "@emotion/css";
import { useCommands } from "@remirror/react";
import { useQuery } from "@tanstack/react-query";
import {
  queryTrackGroups,
  queryTracks,
  queryUserCollection,
  queryUserWishlistTrackGroups,
} from "queries";
import React from "react";
import { useTranslation } from "react-i18next";
import { FaMusic } from "react-icons/fa";
import { useAuthContext } from "state/AuthContext";
import { isTrackGroupPurchase, isTrackPurchase } from "types/typeguards";
import { useDebounce } from "use-debounce";
import { matchesTokens } from "utils/matchesTokens";
import { widgetUrl } from "utils/tracks";

import Button from "../Button";
import CommandSearch, {
  CommandSearchSection,
} from "../CommandSearch/CommandSearch";

import UploadMusicModal from "./UploadMusicModal";

type Scope = "all" | "collection" | "wishlist";
type Kind = "all" | "track" | "trackGroup";

const InsertMirloWidgetButton: React.FC<{
  artistId?: number;
}> = ({ artistId }) => {
  const { addIframe } = useCommands();
  const { t } = useTranslation("translation", { keyPrefix: "textEditor" });
  const { t: tShared } = useTranslation("translation", {
    keyPrefix: "commandSearch",
  });
  const { user } = useAuthContext();

  const [view, setView] = React.useState<"closed" | "search" | "upload">(
    "closed"
  );
  const [query, setQuery] = React.useState("");
  const [scope, setScope] = React.useState<Scope>("all");
  const [kind, setKind] = React.useState<Kind>("all");

  const open = view === "search";

  React.useEffect(() => {
    if (view === "closed") {
      setQuery("");
      setScope("all");
      setKind("all");
    }
  }, [view]);

  const [debouncedQuery] = useDebounce(query, 300);
  const trimmed = debouncedQuery.trim();
  const searchActive = open && trimmed.length >= 2;
  const useBackendSearch = !user || scope === "all";

  const wantTracks = kind === "all" || kind === "track";
  const wantTrackGroups = kind === "all" || kind === "trackGroup";

  const collectionQ = useQuery({
    ...queryUserCollection(user?.id),
    enabled: open && !!user?.id,
  });
  const wishlistTGQ = useQuery({
    ...queryUserWishlistTrackGroups(user?.id),
    enabled: open && !!user?.id,
  });

  const tracksQ = useQuery({
    ...queryTracks({ q: trimmed, take: 10 }),
    enabled: searchActive && useBackendSearch && wantTracks,
  });
  const trackGroupsQ = useQuery({
    ...queryTrackGroups({ q: trimmed, take: 10 }),
    enabled: searchActive && useBackendSearch && wantTrackGroups,
  });

  const embedTrack = React.useCallback(
    (id: number) => {
      addIframe({ src: widgetUrl(id, "track"), height: 137, width: 700 });
      setView("closed");
    },
    [addIframe]
  );

  const embedTrackGroup = React.useCallback(
    (id: number) => {
      addIframe({ src: widgetUrl(id, "trackGroup"), height: 371, width: 700 });
      setView("closed");
    },
    [addIframe]
  );

  const sections = React.useMemo<CommandSearchSection[]>(() => {
    if (!searchActive) return [];
    const out: CommandSearchSection[] = [];
    let tracks: { id: number; name: string }[] = [];
    let albums: { id: number; name: string }[] = [];

    if (useBackendSearch) {
      tracks = (tracksQ.data?.results ?? []).map((r) => ({
        id: r.id,
        name: `${r.trackGroup.artist?.name ?? ""} · ${r.title}`,
      }));
      albums = (trackGroupsQ.data?.results ?? []).map((r) => ({
        id: r.id,
        name: `${r.artist?.name ?? ""} · ${r.title}`,
      }));
    } else if (scope === "collection") {
      (collectionQ.data ?? []).forEach((p) => {
        if (
          isTrackPurchase(p) &&
          p.track &&
          matchesTokens(
            [p.track.title, p.track.trackGroup?.artist?.name],
            trimmed
          )
        ) {
          tracks.push({
            id: p.track.id,
            name: `${p.track.trackGroup?.artist?.name ?? ""} · ${p.track.title}`,
          });
        }
        if (
          isTrackGroupPurchase(p) &&
          p.trackGroup &&
          matchesTokens(
            [p.trackGroup.title, p.trackGroup.artist?.name],
            trimmed
          )
        ) {
          albums.push({
            id: p.trackGroup.id,
            name: `${p.trackGroup.artist?.name ?? ""} · ${p.trackGroup.title}`,
          });
        }
      });
      tracks = tracks.slice(0, 10);
      albums = albums.slice(0, 10);
    } else {
      (user?.trackFavorites ?? []).forEach((tf) => {
        if (
          matchesTokens(
            [tf.track.title, tf.track.trackGroup?.artist?.name],
            trimmed
          )
        ) {
          tracks.push({
            id: tf.trackId,
            name: `${tf.track.trackGroup?.artist?.name ?? ""} · ${tf.track.title}`,
          });
        }
      });
      (wishlistTGQ.data ?? []).forEach((w) => {
        if (
          w.trackGroup &&
          matchesTokens(
            [w.trackGroup.title, w.trackGroup.artist?.name],
            trimmed
          )
        ) {
          albums.push({
            id: w.trackGroupId,
            name: `${w.trackGroup.artist?.name ?? ""} · ${w.trackGroup.title}`,
          });
        }
      });
      tracks = tracks.slice(0, 10);
      albums = albums.slice(0, 10);
    }

    if (wantTracks && tracks.length > 0) {
      out.push({
        category: tShared("categoryTracks"),
        items: tracks.map((tr) => ({
          key: `track-${tr.id}`,
          node: tr.name,
          onSelect: () => embedTrack(tr.id),
        })),
      });
    }
    if (wantTrackGroups && albums.length > 0) {
      out.push({
        category: tShared("categoryReleases"),
        items: albums.map((tg) => ({
          key: `trackGroup-${tg.id}`,
          node: tg.name,
          onSelect: () => embedTrackGroup(tg.id),
        })),
      });
    }
    return out;
  }, [
    searchActive,
    trimmed,
    user,
    scope,
    useBackendSearch,
    wantTracks,
    wantTrackGroups,
    tracksQ.data,
    trackGroupsQ.data,
    collectionQ.data,
    wishlistTGQ.data,
    embedTrack,
    embedTrackGroup,
    tShared,
  ]);

  const isLoading =
    (useBackendSearch && (tracksQ.isFetching || trackGroupsQ.isFetching)) ||
    (!useBackendSearch && (collectionQ.isFetching || wishlistTGQ.isFetching));

  const hasCollection = (collectionQ.data?.length ?? 0) > 0;
  const hasWishlist =
    (user?.trackFavorites?.length ?? 0) > 0 ||
    (wishlistTGQ.data?.length ?? 0) > 0;

  const filters = [];
  if (hasCollection || hasWishlist) {
    const scopeOptions: { value: string; label: string }[] = [
      { value: "all", label: tShared("scopeEverywhere") },
    ];
    if (hasCollection) {
      scopeOptions.push({
        value: "collection",
        label: tShared("scopeCollection"),
      });
    }
    if (hasWishlist) {
      scopeOptions.push({
        value: "wishlist",
        label: tShared("scopeWishlist"),
      });
    }
    filters.push({
      label: tShared("filterLabelScope"),
      value: scope,
      options: scopeOptions,
      onChange: (v: string) => setScope(v as Scope),
    });
  }
  filters.push({
    label: tShared("filterLabelKind"),
    value: kind,
    options: [
      { value: "all", label: tShared("kindAll") },
      { value: "track", label: tShared("categoryTracks") },
      { value: "trackGroup", label: tShared("categoryReleases") },
    ],
    onChange: (v: string) => setKind(v as Kind),
  });

  return (
    <>
      <Button
        aria-label={t("addSomeMusic")}
        startIcon={<FaMusic />}
        type="button"
        onClick={() => setView("search")}
      />

      <CommandSearch
        open={open}
        onClose={() => setView("closed")}
        title={t("addMusicInThisPost")}
        placeholder={t("searchPlaceholder")}
        query={query}
        onQueryChange={setQuery}
        sections={sections}
        isLoading={isLoading}
        filters={filters}
        footer={
          artistId ? (
            <button
              type="button"
              onClick={() => setView("upload")}
              className={css`
                background: none;
                border: none;
                color: inherit;
                cursor: pointer;
                padding: 0;
                font: inherit;
                text-decoration: underline;
              `}
            >
              {t("orUploadANewTrack")}
            </button>
          ) : undefined
        }
      />

      <UploadMusicModal
        open={view === "upload"}
        onClose={() => setView("closed")}
        artistId={artistId}
        onTrackReady={embedTrack}
      />
    </>
  );
};

export default InsertMirloWidgetButton;
