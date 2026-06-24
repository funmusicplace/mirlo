import { act, renderHook, waitFor } from "@testing-library/react";
import api from "services/api";
import { usePlayerSyncState } from "utils/playerSync";
import { isEmbeddedInMirlo } from "utils/widgetContext";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { usePostWidgetData } from "./usePostWidgetData";

const mockCurrentTrack = vi.hoisted(() => ({
  value: undefined as Track | undefined,
}));

vi.mock("components/Player/useCurrentTrackHook", () => ({
  default: () => ({ currentTrack: mockCurrentTrack.value }),
}));

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useParams: () => ({ id: "post-1" }) };
});

vi.mock("services/api", () => ({
  default: { get: vi.fn() },
}));

vi.mock("utils/playerSync", () => ({
  usePlayerSyncState: vi.fn(),
}));

vi.mock("utils/widgetContext", () => ({
  isEmbeddedInMirlo: vi.fn(),
}));

const makePost = (): Post => ({
  id: 1,
  title: "Widget post",
  content: "",
  publishedAt: "2026-06-24T00:00:00.000Z",
  isPublic: true,
  isContentHidden: false,
  isDraft: false,
  tracks: [
    { postId: 1, trackId: 11, isPlayable: true, title: "Track one" },
    { postId: 1, trackId: 12, isPlayable: true, title: "Track two" },
  ],
});

const mockPostFetch = () => {
  vi.mocked(api.get).mockResolvedValue({ result: makePost() } as any);
};

describe("usePostWidgetData", () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset();
    vi.mocked(isEmbeddedInMirlo).mockReset();
    vi.mocked(usePlayerSyncState).mockReset();
    vi.mocked(isEmbeddedInMirlo).mockReturnValue(true);
    mockCurrentTrack.value = {
      id: 11,
      title: "Track one",
      audio: { duration: 123 },
    } as Track;
    vi.mocked(usePlayerSyncState).mockReturnValue({
      playing: true,
      currentTrackId: 11,
      currentSeconds: 37,
    });
    mockPostFetch();
  });

  test("uses broadcast elapsed seconds when the synced track belongs to the post", async () => {
    const { result } = renderHook(() => usePostWidgetData());

    await waitFor(() => {
      expect(result.current.elapsedSeconds).toBe(37);
    });
    expect(result.current.currentTrack?.id).toBe(11);
  });

  test("resets embedded elapsed seconds and hides the current track when the synced track belongs to another widget", async () => {
    mockCurrentTrack.value = {
      id: 999,
      title: "External track",
      audio: { duration: 456 },
    } as Track;
    vi.mocked(usePlayerSyncState).mockReturnValue({
      playing: true,
      currentTrackId: 999,
      currentSeconds: 37,
    });

    const { result } = renderHook(() => usePostWidgetData());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.elapsedSeconds).toBe(0);
    expect(result.current.currentTrack).toBeUndefined();
  });

  test("uses local current seconds outside embedded Mirlo widgets", async () => {
    vi.mocked(isEmbeddedInMirlo).mockReturnValue(false);
    const { result } = renderHook(() => usePostWidgetData());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    act(() => result.current.setCurrentSeconds(42));

    expect(result.current.elapsedSeconds).toBe(42);
  });
});
