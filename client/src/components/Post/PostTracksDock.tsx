import { css } from "@emotion/css";
import TrackRow from "components/common/TrackList/TrackRow";
import React from "react";
import { useTranslation } from "react-i18next";
import { FaChevronDown, FaChevronUp } from "react-icons/fa";
import { useAuthContext } from "state/AuthContext";
import { useGlobalStateContext } from "state/GlobalState";
import { safeLocalStorage } from "utils/safeLocalStorage";
import { isTrackOwnedOrPreview } from "utils/tracks";

const COLLAPSED_KEY = (postId: number, isMobile: boolean) =>
  `post-tracks-dock:collapsed:${isMobile ? "mobile" : "desktop"}:${postId}`;

const readBool = (key: string, fallback: boolean) => {
  const raw = safeLocalStorage.read(key);
  if (raw === null) return fallback;
  return raw === "1";
};

const asideBase = css`
  position: fixed;
  right: 1rem;
  bottom: 5rem;
  z-index: 9;
  width: 20rem;
  max-width: calc(100vw - 2rem);
  display: flex;
  flex-direction: column;
  background-color: var(--mi-background-color);
  color: var(--mi-text-color);
  border: 1px solid var(--mi-tint-x-color);
  border-radius: 0.5rem;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  overflow: hidden;

  @media (max-width: 768px) {
    right: 0;
    left: 0;
    bottom: 4rem;
    width: auto;
    max-width: none;
    border-radius: 0;
    border-bottom: 0;
    box-shadow: 0 -6px 16px var(--mi-tint-x-color);
  }
`;

const expandedHeight = css`
  height: min(12rem, calc(100vh - 7rem));
  @media (max-width: 768px) {
    height: calc(100vh - 8rem - var(--header-cover-sticky-height, 0px));
  }
`;

const PostTracksDock: React.FC<{
  postId: number;
  tracks: Track[];
}> = ({ postId, tracks }) => {
  const { t } = useTranslation("translation", { keyPrefix: "postTracksDock" });
  const { dispatch } = useGlobalStateContext();
  const { user } = useAuthContext();

  const trackGroup = tracks[0]?.trackGroup;

  const [isMobile, setIsMobile] = React.useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 768px)").matches
  );

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 768px)");
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const [collapsed, setCollapsed] = React.useState(() =>
    readBool(COLLAPSED_KEY(postId, isMobile), isMobile)
  );

  React.useEffect(() => {
    setCollapsed(readBool(COLLAPSED_KEY(postId, isMobile), isMobile));
  }, [isMobile, postId]);

  React.useEffect(() => {
    safeLocalStorage.write(
      COLLAPSED_KEY(postId, isMobile),
      collapsed ? "1" : "0"
    );
  }, [collapsed, postId, isMobile]);

  // Coordinates floating buttons positions with PlayerActions and
  // ManageArtistButtons via global CSS vars on <html>. Single-mount invariant:
  // mounting two PostTracksDocks simultaneously would race on these vars.
  React.useEffect(() => {
    const playerActionsDesktop = collapsed ? "8rem" : "17.5rem";
    const playerActionsMobile = collapsed
      ? "7.5rem"
      : "calc(100vh - var(--header-cover-sticky-height, 0px) - 3.5rem)";
    const root = document.documentElement.style;
    root.setProperty("--player-actions-bottom-offset", playerActionsDesktop);
    root.setProperty(
      "--player-actions-bottom-offset-mobile",
      playerActionsMobile
    );
    root.setProperty("--fixed-actions-bottom-offset", "8rem");
    root.setProperty("--fixed-actions-bottom-offset-mobile", "7.5rem");
    return () => {
      root.removeProperty("--player-actions-bottom-offset");
      root.removeProperty("--player-actions-bottom-offset-mobile");
      root.removeProperty("--fixed-actions-bottom-offset");
      root.removeProperty("--fixed-actions-bottom-offset-mobile");
    };
  }, [collapsed]);

  const addTracksToQueue = React.useCallback(
    (id: number) => {
      const playableIds = tracks
        .filter((track) => isTrackOwnedOrPreview(track, user, trackGroup))
        .map((track) => track.id);
      const startingIndex = playableIds.indexOf(id);
      dispatch({
        type: "startPlayingIds",
        playerQueueIds: playableIds,
        startingIndex: startingIndex >= 0 ? startingIndex : 0,
      });
    },
    [dispatch, trackGroup, tracks, user]
  );

  if (tracks.length === 0 || !trackGroup) return null;

  const labelId = `post-tracks-dock-label-${postId}`;
  const listId = `post-tracks-dock-list-${postId}`;

  return (
    <aside
      aria-labelledby={labelId}
      className={`${asideBase} ${collapsed ? "" : expandedHeight}`}
    >
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        aria-expanded={!collapsed}
        aria-controls={listId}
        className="flex items-center justify-between gap-2 px-3 py-2 max-md:py-3.5 bg-(--mi-tint-color) border-0 border-b border-(--mi-tint-x-color) text-inherit text-left cursor-pointer [font:inherit]"
      >
        <span
          id={labelId}
          className="flex-1 min-w-0 truncate text-xs font-semibold uppercase tracking-wider opacity-75"
        >
          {t("label")}
        </span>
        {collapsed ? (
          <FaChevronUp aria-hidden className="shrink-0 opacity-60" />
        ) : (
          <FaChevronDown aria-hidden className="shrink-0 opacity-60" />
        )}
      </button>
      <ul
        id={listId}
        hidden={collapsed}
        className="list-none m-0 py-1 overflow-y-auto overscroll-contain flex-1 min-h-0 divide-y divide-(--mi-tint-color)"
      >
        {tracks.map((track) => (
          <TrackRow
            key={track.id}
            track={track}
            trackGroup={track.trackGroup ?? trackGroup}
            addTracksToQueue={addTracksToQueue}
            size="dock"
          />
        ))}
      </ul>
    </aside>
  );
};

export default PostTracksDock;
