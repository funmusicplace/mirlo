import { act, renderHook, waitFor } from "@testing-library/react";
import api from "services/api";
import { useAuthContext } from "state/AuthContext";
import { usePlayerSyncState } from "utils/playerSync";
import { isEmbeddedInMirlo } from "utils/widgetContext";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { useTrackWidgetData } from "./useTrackWidgetData";

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useParams: () => ({ id: "21" }) };
});

vi.mock("services/api", () => ({
  default: { get: vi.fn() },
}));

vi.mock("state/AuthContext", () => ({
  useAuthContext: vi.fn(),
}));

vi.mock("utils/injectedData", () => ({
  getInjectedArtist: vi.fn(),
  getInjectedTrack: vi.fn(),
}));

vi.mock("utils/playerSync", () => ({
  usePlayerSyncState: vi.fn(),
}));

vi.mock("utils/widgetContext", () => ({
  isEmbeddedInMirlo: vi.fn(),
}));

const artist = { id: 5, name: "Widget Artist", userId: 50 } as Artist;

const track = {
  id: 21,
  title: "Track one",
  trackGroup: { id: 1, artistId: artist.id, artist },
} as Track;

const renderLoaded = async () => {
  const hook = renderHook(() => useTrackWidgetData());
  await waitFor(() => {
    expect(hook.result.current.isLoading).toBe(false);
  });
  return hook;
};

describe("useTrackWidgetData", () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset();
    vi.mocked(useAuthContext).mockReset();
    vi.mocked(isEmbeddedInMirlo).mockReset();
    vi.mocked(usePlayerSyncState).mockReset();
    vi.mocked(useAuthContext).mockReturnValue({ user: null } as any);
    vi.mocked(isEmbeddedInMirlo).mockReturnValue(true);
    vi.mocked(usePlayerSyncState).mockReturnValue({
      playing: true,
      currentTrackId: 21,
      currentSeconds: 37,
    });
    vi.mocked(api.get).mockImplementation(
      async (endpoint: string): Promise<any> => {
        if (endpoint === "tracks/21") {
          return { result: track };
        }
        if (endpoint === `artists/${artist.id}`) {
          return { result: artist };
        }
        throw new Error(`Unexpected endpoint: ${endpoint}`);
      }
    );
  });

  test("uses broadcast seconds when the synced track is the widget track", async () => {
    const { result } = await renderLoaded();

    expect(result.current.currentSeconds).toBe(37);
  });

  test("keeps the broadcast seconds while paused on the widget track", async () => {
    vi.mocked(usePlayerSyncState).mockReturnValue({
      playing: false,
      currentTrackId: 21,
      currentSeconds: 37,
    });

    const { result } = await renderLoaded();

    expect(result.current.currentSeconds).toBe(37);
  });

  test("resets to zero when the parent player moves to another track", async () => {
    const { result, rerender } = await renderLoaded();
    expect(result.current.currentSeconds).toBe(37);

    vi.mocked(usePlayerSyncState).mockReturnValue({
      playing: true,
      currentTrackId: 999,
      currentSeconds: 12,
    });
    rerender();

    expect(result.current.currentSeconds).toBe(0);
  });

  test("shows zero when nothing is synced yet", async () => {
    vi.mocked(usePlayerSyncState).mockReturnValue(null);

    const { result } = await renderLoaded();

    expect(result.current.currentSeconds).toBe(0);
  });

  test("ignores local seconds inside embedded Mirlo widgets", async () => {
    const { result } = await renderLoaded();
    act(() => result.current.setCurrentSeconds(42));

    expect(result.current.currentSeconds).toBe(37);
  });

  test("uses local seconds outside embedded Mirlo widgets", async () => {
    vi.mocked(isEmbeddedInMirlo).mockReturnValue(false);

    const { result } = await renderLoaded();
    act(() => result.current.setCurrentSeconds(42));

    expect(result.current.currentSeconds).toBe(42);
  });
});
