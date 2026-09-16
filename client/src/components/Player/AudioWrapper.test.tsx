import { render, screen } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: "en" } }),
  Trans: ({ i18nKey }: { i18nKey: string }) => <>{i18nKey}</>,
}));

vi.mock("services/api", () => ({
  default: {
    streamUrl: () => "http://localhost:3000/v1/tracks/1/stream/playlist.m3u8",
    get: vi.fn(async () => ({ result: { playLimit: null } })),
  },
}));

vi.mock("@mirlo/react-hls-player", () => ({
  default: ({ playerRef, hlsConfig, getHLSInstance, src, ...props }: any) => (
    <audio data-testid="player" ref={playerRef} {...props} />
  ),
}));

vi.mock("./BuyTrackModal", () => ({ default: () => null }));
vi.mock("../common/SongTimeDisplay", () => ({ default: () => null }));

vi.mock("state/GlobalState", () => ({
  useGlobalStateContext: () => globalStateContext,
}));

import { AudioWrapper } from "./AudioWrapper";

const makeTrack = (overrides: object = {}) =>
  ({
    id: 1,
    title: "Test Track",
    trackGroupId: 10,
    trackArtists: [],
    trackGroup: {
      id: 10,
      title: "Test Album",
      artist: { id: 1, name: "Test Artist", urlSlug: "test-artist" },
      cover: { sizes: {} },
    },
    ...overrides,
  }) as unknown as Track;

const dispatch = vi.fn();

let globalStateContext: {
  state: {
    playerQueueIds: number[];
    currentlyPlayingIndex?: number;
    playing?: boolean;
    looping?: "loopTrack" | "loopQueue";
  };
  dispatch: typeof dispatch;
};

// ---- helpers ----------------------------------------------------------------

const renderPlayer = async () => {
  render(
    <AudioWrapper
      currentTrack={makeTrack()}
      position="0"
      currentSeconds={0}
      setCurrentSeconds={vi.fn()}
    />
  );
  return (await screen.findByTestId("player")) as HTMLAudioElement;
};

const firePause = (
  player: HTMLAudioElement,
  { readyState = 4, ended = false } = {}
) => {
  Object.defineProperty(player, "readyState", {
    value: readyState,
    configurable: true,
  });
  Object.defineProperty(player, "ended", { value: ended, configurable: true });
  player.dispatchEvent(new Event("pause"));
};

// ---- tests ------------------------------------------------------------------

describe("AudioWrapper", () => {
  beforeEach(() => {
    dispatch.mockClear();
    globalStateContext = {
      state: { playerQueueIds: [1], currentlyPlayingIndex: 0, playing: true },
      dispatch,
    };
    vi.spyOn(window.HTMLMediaElement.prototype, "play").mockResolvedValue(
      undefined
    );
    vi.spyOn(window.HTMLMediaElement.prototype, "pause").mockImplementation(
      () => {}
    );
  });

  it("stops reporting playback when the browser pauses us (#761)", async () => {
    const player = await renderPlayer();
    dispatch.mockClear();

    firePause(player);

    expect(dispatch).toHaveBeenCalledWith({
      type: "setPlaying",
      playing: false,
    });
  });

  it("ignores the pause fired while the media source is torn down", async () => {
    const player = await renderPlayer();
    dispatch.mockClear();

    firePause(player, { readyState: 0 });

    expect(dispatch).not.toHaveBeenCalledWith({
      type: "setPlaying",
      playing: false,
    });
  });

  it("ignores the pause some browsers fire alongside `ended`", async () => {
    const player = await renderPlayer();
    dispatch.mockClear();

    firePause(player, { ended: true });

    expect(dispatch).not.toHaveBeenCalledWith({
      type: "setPlaying",
      playing: false,
    });
  });

  it("still reports playback starting", async () => {
    const player = await renderPlayer();
    dispatch.mockClear();

    player.dispatchEvent(new Event("play"));

    expect(dispatch).toHaveBeenCalledWith({
      type: "setPlaying",
      playing: true,
    });
  });
});
