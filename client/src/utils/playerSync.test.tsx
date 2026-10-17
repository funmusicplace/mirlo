vi.mock("state/GlobalState", () => ({ useGlobalStateContext: vi.fn() }));

import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import { PlayerSyncState, useBroadcastPlayerSync } from "./playerSync";

// ---- fixtures ---------------------------------------------------------------

const playing: PlayerSyncState = {
  playing: true,
  currentTrackId: 1,
  currentSeconds: 0,
};

// ---- helpers ----------------------------------------------------------------

const addIframe = (src: string) => {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("src", src);
  document.body.appendChild(iframe);
  return vi
    .spyOn(iframe.contentWindow!, "postMessage")
    .mockImplementation(() => {});
};

// ---- tests ------------------------------------------------------------------

describe("useBroadcastPlayerSync", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    vi.unstubAllEnvs();
  });

  test("posts to relative widget iframes on the page's origin", () => {
    vi.stubEnv("VITE_CLIENT_DOMAIN", "");
    const postMessage = addIframe("/widget/track/1");

    renderHook(() => useBroadcastPlayerSync(playing));

    expect(postMessage).toHaveBeenCalledWith(
      { tag: "mirlo-player-sync", kind: "state", state: playing },
      window.location.origin
    );
  });

  test("posts to absolute widget iframes on the client domain", () => {
    vi.stubEnv("VITE_CLIENT_DOMAIN", "https://mirlo.example");
    const postMessage = addIframe(
      "https://mirlo.example/widget/trackGroup/2?variant=card"
    );

    renderHook(() => useBroadcastPlayerSync(playing));

    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "state" }),
      "https://mirlo.example"
    );
  });

  test("skips widget iframes from other origins and non-widget iframes", () => {
    vi.stubEnv("VITE_CLIENT_DOMAIN", "https://mirlo.example");
    const otherHost = addIframe("https://other.example/widget/track/1");
    const otherHostWithOurUrl = addIframe(
      "https://other.example/?ref=https://mirlo.example/widget/track/1"
    );
    const notWidget = addIframe("https://mirlo.example/embed/video");

    renderHook(() => useBroadcastPlayerSync(playing));

    expect(otherHost).not.toHaveBeenCalled();
    expect(otherHostWithOurUrl).not.toHaveBeenCalled();
    expect(notWidget).not.toHaveBeenCalled();
  });

  test("doesn't re-post an unchanged state", () => {
    vi.stubEnv("VITE_CLIENT_DOMAIN", "");
    const postMessage = addIframe("/widget/track/1");

    const { rerender } = renderHook(
      ({ state }) => useBroadcastPlayerSync(state),
      { initialProps: { state: playing } }
    );
    rerender({ state: { ...playing } });
    rerender({ state: { ...playing, playing: false } });

    expect(postMessage).toHaveBeenCalledTimes(2);
  });
});
