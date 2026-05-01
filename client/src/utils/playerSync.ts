import React from "react";
import { useGlobalStateContext } from "state/GlobalState";

import { isEmbeddedInMirlo } from "./widgetContext";

const MESSAGE_TAG = "mirlo-player-sync";

export type PlayerSyncState = {
  playing: boolean;
  currentTrackId: number | null;
  currentSeconds: number;
};

export type PlayerSyncRequest =
  | { type: "play"; trackId: number }
  | { type: "pause"; trackId: number };

type Message =
  | { tag: typeof MESSAGE_TAG; kind: "state"; state: PlayerSyncState }
  | { tag: typeof MESSAGE_TAG; kind: "request"; request: PlayerSyncRequest };

const isOurMessage = (data: unknown): data is Message =>
  typeof data === "object" &&
  data !== null &&
  (data as { tag?: unknown }).tag === MESSAGE_TAG;

const targetOrigin = (): string =>
  import.meta.env.VITE_CLIENT_DOMAIN || window.location.origin;

const postToIframes = (msg: Message) => {
  const origin = targetOrigin();
  document
    .querySelectorAll<HTMLIFrameElement>(`iframe[src*="${origin}/widget/"]`)
    .forEach((iframe) => iframe.contentWindow?.postMessage(msg, origin));
};

const postToParent = (msg: Message) => {
  if (window.parent === window) return;
  window.parent.postMessage(msg, targetOrigin());
};

export const useBroadcastPlayerSync = (state: PlayerSyncState) => {
  const lastPayloadRef = React.useRef<string>("");

  React.useEffect(() => {
    const payload = JSON.stringify(state);
    if (payload === lastPayloadRef.current) return;
    lastPayloadRef.current = payload;
    postToIframes({ tag: MESSAGE_TAG, kind: "state", state });
  }, [state]);
};

export const useGlobalPlayerSyncIntegration = () => {
  const { dispatch } = useGlobalStateContext();
  const isInIframe = isEmbeddedInMirlo();
  const prevDispatchedRef = React.useRef<{
    playing: boolean;
    trackId: number | null;
  }>({ playing: false, trackId: null });

  React.useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.origin !== targetOrigin()) return;
      if (!isOurMessage(event.data)) return;

      if (isInIframe) {
        if (event.data.kind !== "state") return;
        const { playing, currentTrackId } = event.data.state;
        if (
          prevDispatchedRef.current.playing === playing &&
          prevDispatchedRef.current.trackId === currentTrackId
        ) {
          return;
        }
        prevDispatchedRef.current = { playing, trackId: currentTrackId };
        if (playing && currentTrackId !== null) {
          dispatch({
            type: "startPlayingIds",
            playerQueueIds: [currentTrackId],
          });
        } else {
          dispatch({ type: "setPlaying", playing: false });
        }
      } else {
        if (event.data.kind !== "request") return;
        const req = event.data.request;
        if (req.type === "play") {
          dispatch({
            type: "startPlayingIds",
            playerQueueIds: [req.trackId],
          });
        } else {
          dispatch({ type: "setPlaying", playing: false });
        }
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [dispatch, isInIframe]);
};

export const usePlayerSyncState = (): PlayerSyncState | null => {
  const [state, setState] = React.useState<PlayerSyncState | null>(null);

  React.useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.origin !== targetOrigin()) return;
      if (!isOurMessage(event.data)) return;
      if (event.data.kind !== "state") return;
      const next = event.data.state;
      setState((prev) =>
        prev !== null &&
        prev.playing === next.playing &&
        prev.currentTrackId === next.currentTrackId &&
        prev.currentSeconds === next.currentSeconds
          ? prev
          : next
      );
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  return state;
};

export const usePlayerSyncRequest = () => {
  return React.useCallback((request: PlayerSyncRequest) => {
    postToParent({ tag: MESSAGE_TAG, kind: "request", request });
  }, []);
};
