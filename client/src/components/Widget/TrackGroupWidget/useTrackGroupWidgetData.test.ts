import { act, renderHook, waitFor } from "@testing-library/react";
import api from "services/api";
import { useAuthContext } from "state/AuthContext";
import { usePlayerSyncState } from "utils/playerSync";
import { isEmbeddedInMirlo } from "utils/widgetContext";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { useTrackGroupWidgetData } from "./useTrackGroupWidgetData";

const mockCurrentTrack = vi.hoisted(() => ({
  value: undefined as Track | undefined,
}));

vi.mock("components/Player/useCurrentTrackHook", () => ({
  default: () => ({ currentTrack: mockCurrentTrack.value }),
}));

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useParams: () => ({ id: "track-group-1" }) };
});

vi.mock("services/api", () => ({
  default: { get: vi.fn() },
}));

vi.mock("state/AuthContext", () => ({
  useAuthContext: vi.fn(),
}));

vi.mock("utils/injectedData", () => ({
  getInjectedArtist: vi.fn(),
  getInjectedTrackGroup: vi.fn(),
}));

vi.mock("utils/playerSync", () => ({
  usePlayerSyncState: vi.fn(),
}));

vi.mock("utils/widgetContext", () => ({
  isEmbeddedInMirlo: vi.fn(),
}));

const artist = {
  id: 5,
  name: "Widget Artist",
  userId: 50,
} as Artist;

const makeTrackGroup = (): TrackGroup =>
  ({
    id: 1,
    title: "Widget release",
    artistId: artist.id,
    artist,
    tracks: [
      { id: 21, title: "Track one", isPreview: true },
      { id: 22, title: "Track two", isPreview: true },
    ] as Track[],
  }) as TrackGroup;

const mockTrackGroupFetch = () => {
  vi.mocked(api.get).mockImplementation(
    async (endpoint: string): Promise<any> => {
      if (endpoint === "trackGroups/track-group-1") {
        return { result: makeTrackGroup() };
      }
      if (endpoint === `artists/${artist.id}`) {
        return { result: artist };
      }
      throw new Error(`Unexpected endpoint: ${endpoint}`);
    }
  );
};

describe("useTrackGroupWidgetData", () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset();
    vi.mocked(useAuthContext).mockReset();
    vi.mocked(isEmbeddedInMirlo).mockReset();
    vi.mocked(usePlayerSyncState).mockReset();
    vi.mocked(useAuthContext).mockReturnValue({ user: null } as any);
    vi.mocked(isEmbeddedInMirlo).mockReturnValue(true);
    mockCurrentTrack.value = {
      id: 21,
      title: "Track one",
      isPreview: true,
      audio: { duration: 123 },
    } as Track;
    vi.mocked(usePlayerSyncState).mockReturnValue({
      playing: true,
      currentTrackId: 21,
      currentSeconds: 37,
    });
    mockTrackGroupFetch();
  });

  test("uses broadcast elapsed seconds when the synced track belongs to the track group", async () => {
    const { result } = renderHook(() => useTrackGroupWidgetData());

    await waitFor(() => {
      expect(result.current.elapsedSeconds).toBe(37);
    });
    expect(result.current.currentTrack?.id).toBe(21);
  });

  test("resets embedded elapsed seconds and hides the current track when the synced track belongs to another widget", async () => {
    mockCurrentTrack.value = {
      id: 999,
      title: "External track",
      isPreview: true,
      audio: { duration: 456 },
    } as Track;
    vi.mocked(usePlayerSyncState).mockReturnValue({
      playing: true,
      currentTrackId: 999,
      currentSeconds: 37,
    });

    const { result } = renderHook(() => useTrackGroupWidgetData());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.elapsedSeconds).toBe(0);
    expect(result.current.currentTrack).toBeUndefined();
  });

  test("uses local current seconds outside embedded Mirlo widgets", async () => {
    vi.mocked(isEmbeddedInMirlo).mockReturnValue(false);
    const { result } = renderHook(() => useTrackGroupWidgetData());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    act(() => result.current.setCurrentSeconds(42));

    expect(result.current.elapsedSeconds).toBe(42);
  });
});
