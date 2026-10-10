import type { Meta, StoryObj } from "@storybook/react";
import { within } from "@storybook/test";
import { clearPlayerQueue } from "components/Widget/widgetStoryUtils";
import { bypass, http, HttpResponse, passthrough } from "msw";
import React from "react";
import { GlobalStateProvider } from "state/GlobalState";

import {
  RELEASES,
  SHOWCASE_ARTIST_WITH_RELEASES,
} from "../../showcase/shared/fixtures";
import { authAs } from "../../showcase/shared/helpers";

import Player from ".";

const STREAM_PATH = "/v1/showcase-audio/noise.m3u8";

const RELEASE = RELEASES.tidal;

const TRACKS: Track[] = RELEASE.tracks.slice(0, 2).map((track) => ({
  ...track,
  trackGroup: RELEASE,
  audio: { ...track.audio!, url: STREAM_PATH, duration: 20 },
}));

/**
 * The global player, queued with two copies of the 20 second pink noise
 * track the dev seed generates. Its last HLS segment is a single 26ms MP3
 * frame, which used to leave the player stuck at the end instead of moving
 * on to the next track (#2479).
 */
const meta = {
  title: "Player/Player",
  component: Player,
  render: () => (
    <GlobalStateProvider>
      <Player />
    </GlobalStateProvider>
  ),
  beforeEach: () => {
    localStorage.setItem(
      "nomadState",
      JSON.stringify({
        playerQueueIds: TRACKS.map((track) => track.id),
        currentlyPlayingIndex: 0,
      })
    );
    return clearPlayerQueue;
  },
  parameters: {
    layout: "fullscreen",
    msw: {
      handlers: {
        auth: authAs(null),
        audio: [
          http.get(`*${STREAM_PATH}`, async () => {
            const audioRoot = `${window.location.origin}/showcase/audio/`;
            const playlist = await fetch(bypass(`${audioRoot}noise.m3u8`)).then(
              (r) => r.text()
            );
            return new HttpResponse(
              playlist.replace(/^(noise-\d+\.ts)$/gm, `${audioRoot}$1`),
              { headers: { "Content-Type": "application/vnd.apple.mpegurl" } }
            );
          }),
          http.get("*/showcase/audio/*", () => passthrough()),
        ],
        tracks: http.get("*/v1/tracks/:id", ({ params }) => {
          const track = TRACKS.find((t) => String(t.id) === params.id);
          return track
            ? HttpResponse.json({ result: track })
            : HttpResponse.json({ error: "Not found" }, { status: 404 });
        }),
        release: ["*/v1/trackGroups/:id/", "*/v1/trackGroups/:id"].map((path) =>
          http.get(path, () => HttpResponse.json({ result: RELEASE }))
        ),
        artist: http.get("*/v1/artists/:id", () =>
          HttpResponse.json({ result: SHOWCASE_ARTIST_WITH_RELEASES })
        ),
      },
    },
  },
} satisfies Meta<typeof Player>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Press play and let "Low Water" run to the end: the player should move on
 * to "Harbour Lights" on its own.
 */
export const AdvancesAtEndOfTrack: Story = {
  play: async () => {
    await within(document.body).findAllByText("Low Water", undefined, {
      timeout: 5000,
    });
  },
};
