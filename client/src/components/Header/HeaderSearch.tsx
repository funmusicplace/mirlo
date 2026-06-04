import { css } from "@emotion/css";
import { useQuery } from "@tanstack/react-query";
import Button from "components/common/Button";
import CommandSearch, {
  CommandSearchFilter,
  CommandSearchSection,
} from "components/common/CommandSearch/CommandSearch";
import {
  queryArtists,
  queryTags,
  queryTrackGroups,
  queryTracks,
  queryUserCollection,
  queryUserWishlistTrackGroups,
} from "queries";
import React from "react";
import { useTranslation } from "react-i18next";
import { FaSearch } from "react-icons/fa";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuthContext } from "state/AuthContext";
import { isTrackGroupPurchase, isTrackPurchase } from "types/typeguards";
import { useDebounce } from "use-debounce";
import { matchesTokens } from "utils/matchesTokens";

import { bp } from "../../constants";

type Scope = "all" | "collection" | "wishlist";
type Kind = "all" | "track" | "trackGroup" | "artist" | "label";

type HeaderResultBase = {
  key: string;
  name: string;
  href: string;
};

const HeaderSearch: React.FC = () => {
  const { t } = useTranslation("translation", { keyPrefix: "headerSearch" });
  const { t: tShared } = useTranslation("translation", {
    keyPrefix: "commandSearch",
  });
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === "/";
  const { user } = useAuthContext();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [scope, setScope] = React.useState<Scope>("all");
  const [kind, setKind] = React.useState<Kind>("all");

  const [debouncedQuery] = useDebounce(query, 300);
  const trimmed = debouncedQuery.trim();
  const searchActive = open && trimmed.length >= 2;
  const useBackendSearch = !user || scope === "all";

  const wantTracks = kind === "all" || kind === "track";
  const wantTrackGroups = kind === "all" || kind === "trackGroup";
  const wantArtists = kind === "all" || kind === "artist";
  const wantTags = kind === "all";
  const wantLabels = kind === "all" || kind === "label";

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
  const artistsQ = useQuery({
    ...queryArtists({ name: trimmed, take: 10 }),
    enabled: searchActive && useBackendSearch && wantArtists,
  });
  const labelsQ = useQuery({
    ...queryArtists({ name: trimmed, isLabel: true, take: 10 }),
    enabled: searchActive && useBackendSearch && wantLabels,
  });
  const tagsQ = useQuery({
    ...queryTags({ tag: trimmed, orderBy: "count", take: 10 }),
    enabled: searchActive && useBackendSearch && wantTags,
  });

  const navigateAndClose = React.useCallback(
    (href: string) => {
      navigate(href);
      setOpen(false);
    },
    [navigate]
  );

  const trackHref = (tr: Track) =>
    `/${tr.trackGroup.artist?.urlSlug ?? tr.trackGroup.artistId}/release/${tr.trackGroup.urlSlug ?? tr.trackGroupId}/tracks/${tr.id}`;
  const trackGroupHref = (tg: TrackGroup) =>
    `/${tg.artist?.urlSlug ?? tg.artistId}/release/${tg.urlSlug ?? tg.id}`;

  const sections = React.useMemo<CommandSearchSection[]>(() => {
    if (!searchActive) return [];
    const out: CommandSearchSection[] = [];

    const pushSection = (category: string, items: HeaderResultBase[]) => {
      if (items.length === 0) return;
      out.push({
        category,
        items: items.map((it) => ({
          key: it.key,
          node: it.name,
          onSelect: () => navigateAndClose(it.href),
        })),
      });
    };

    if (user && scope === "collection") {
      const tracks: HeaderResultBase[] = [];
      const albums: HeaderResultBase[] = [];
      (collectionQ.data ?? []).forEach((p) => {
        if (
          wantTracks &&
          isTrackPurchase(p) &&
          p.track &&
          matchesTokens(
            [p.track.title, p.track.trackGroup?.artist?.name],
            trimmed
          )
        ) {
          tracks.push({
            key: `track-${p.track.id}`,
            name: `${p.track.trackGroup?.artist?.name ?? ""} · ${p.track.title}`,
            href: trackHref(p.track),
          });
        }
        if (
          wantTrackGroups &&
          isTrackGroupPurchase(p) &&
          p.trackGroup &&
          matchesTokens(
            [p.trackGroup.title, p.trackGroup.artist?.name],
            trimmed
          )
        ) {
          albums.push({
            key: `trackGroup-${p.trackGroup.id}`,
            name: `${p.trackGroup.artist?.name ?? ""} · ${p.trackGroup.title}`,
            href: trackGroupHref(p.trackGroup),
          });
        }
      });
      pushSection(t("tracks"), tracks.slice(0, 10));
      pushSection(t("albums"), albums.slice(0, 10));
      return out;
    }

    if (user && scope === "wishlist") {
      const tracks: HeaderResultBase[] = [];
      const albums: HeaderResultBase[] = [];
      if (wantTracks) {
        (user.trackFavorites ?? []).forEach((tf) => {
          if (
            matchesTokens(
              [tf.track.title, tf.track.trackGroup?.artist?.name],
              trimmed
            )
          ) {
            tracks.push({
              key: `track-${tf.trackId}`,
              name: `${tf.track.trackGroup?.artist?.name ?? ""} · ${tf.track.title}`,
              href: trackHref(tf.track),
            });
          }
        });
      }
      if (wantTrackGroups) {
        (wishlistTGQ.data ?? []).forEach((w) => {
          if (
            w.trackGroup &&
            matchesTokens(
              [w.trackGroup.title, w.trackGroup.artist?.name],
              trimmed
            )
          ) {
            albums.push({
              key: `trackGroup-${w.trackGroupId}`,
              name: `${w.trackGroup.artist?.name ?? ""} · ${w.trackGroup.title}`,
              href: trackGroupHref(w.trackGroup),
            });
          }
        });
      }
      pushSection(t("tracks"), tracks.slice(0, 10));
      pushSection(t("albums"), albums.slice(0, 10));
      return out;
    }

    pushSection(
      t("tags"),
      (tagsQ.data?.results ?? []).map((r) => ({
        key: `tag-${r.tag}`,
        name: r.tag,
        href: `/releases?tag=${encodeURIComponent(r.tag)}`,
      }))
    );

    pushSection(
      t("artists"),
      (artistsQ.data?.results ?? []).map((r) => ({
        key: `artist-${r.id}`,
        name: r.name,
        href: `/${r.urlSlug ?? r.id}`,
      }))
    );

    pushSection(
      t("albums"),
      (trackGroupsQ.data?.results ?? []).map((tg) => ({
        key: `trackGroup-${tg.id}`,
        name: `${tg.artist?.name ?? ""} · ${tg.title ?? t("untitled")}`,
        href: trackGroupHref(tg),
      }))
    );

    pushSection(
      t("tracks"),
      (tracksQ.data?.results ?? []).map((tr) => ({
        key: `track-${tr.id}`,
        name: `${tr.trackGroup.artist?.name ?? ""} · ${tr.title ?? t("untitled")}`,
        href: trackHref(tr),
      }))
    );

    pushSection(
      t("labels"),
      (labelsQ.data?.results ?? []).map((label) => ({
        key: `label-${label.id}`,
        name: label.name,
        href: `/${label.urlSlug ?? label.id}`,
      }))
    );

    return out;
  }, [
    searchActive,
    trimmed,
    user,
    scope,
    wantTracks,
    wantTrackGroups,
    collectionQ.data,
    wishlistTGQ.data,
    tagsQ.data,
    artistsQ.data,
    trackGroupsQ.data,
    tracksQ.data,
    labelsQ.data,
    navigateAndClose,
    t,
  ]);

  const isLoading =
    (useBackendSearch &&
      (tracksQ.isFetching ||
        trackGroupsQ.isFetching ||
        artistsQ.isFetching ||
        tagsQ.isFetching ||
        labelsQ.isFetching)) ||
    (!useBackendSearch && (collectionQ.isFetching || wishlistTGQ.isFetching));

  const hasCollection = (collectionQ.data?.length ?? 0) > 0;
  const hasWishlist =
    (user?.trackFavorites?.length ?? 0) > 0 ||
    (wishlistTGQ.data?.length ?? 0) > 0;

  const filters: CommandSearchFilter[] = [];
  if (user && (hasCollection || hasWishlist)) {
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
      onChange: (v) => {
        const next = v as Scope;
        setScope(next);
        if (next !== "all" && (kind === "artist" || kind === "label")) {
          setKind("all");
        }
      },
    });
  }
  const scopedToUserContent = !!user && scope !== "all";

  React.useEffect(() => {
    if (!open) {
      setQuery("");
      setScope("all");
      setKind("all");
    }
  }, [open]);

  const kindOptions = [
    { value: "all", label: tShared("kindAll") },
    { value: "track", label: t("tracks") },
    { value: "trackGroup", label: t("albums") },
    ...(scopedToUserContent
      ? []
      : [
          { value: "artist", label: t("artists") },
          { value: "label", label: t("labels") },
        ]),
  ];
  filters.push({
    label: tShared("filterLabelKind"),
    value: kind,
    options: kindOptions,
    onChange: (v) => setKind(v as Kind),
  });

  return (
    <div role="search">
      <Button
        aria-label={t("searchMusic")}
        variant="transparent"
        onClick={() => setOpen(true)}
        startIcon={<FaSearch size={20} />}
        className={css`
          color: var(--mi-contrast-color) !important;
          font-weight: normal !important;
          svg {
            fill: var(--mi-contrast-color) !important;
          }
          &:hover:not(:disabled) {
            background-color: var(--mi-tint-color) !important;
            color: var(--mi-contrast-color) !important;
            svg {
              fill: var(--mi-contrast-color) !important;
            }
          }
          @media screen and (max-width: ${bp.medium}px) {
            width: var(--mi-touch-target-min);
            height: var(--mi-touch-target-min);
            padding: 0;

            .startIcon {
              margin: 0 !important;
            }
          }
        `}
      >
        {isHome && (
          <span
            className={css`
              @media screen and (max-width: ${bp.medium}px) {
                display: none;
              }
            `}
          >
            {t("searchMusic")}
          </span>
        )}
      </Button>

      <CommandSearch
        open={open}
        onClose={() => setOpen(false)}
        title={t("searchMusicOnMirlo")}
        placeholder={t("search")}
        query={query}
        onQueryChange={setQuery}
        onEnter={(value) => {
          navigate(`/search?search=${encodeURIComponent(value)}`);
          setOpen(false);
        }}
        sections={sections}
        isLoading={isLoading}
        filters={filters}
        footer={
          trimmed.length >= 2 ? (
            <button
              type="button"
              onClick={() => {
                navigate(`/search?search=${encodeURIComponent(trimmed)}`);
                setOpen(false);
              }}
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
              {t("moreResults")}
            </button>
          ) : undefined
        }
      />
    </div>
  );
};

export default HeaderSearch;
