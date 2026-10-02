import type { Meta, StoryObj } from "@storybook/react";
import { screen, userEvent, within } from "@storybook/test";

import { AppFrame, appRouting } from "../shared/AppFrame";
import { recordingViewport, authAs } from "../shared/helpers";

import {
  FULL_ARTIST,
  TIDAL_HOURS,
  paymentsEnabled,
  publicArtistHandlers,
} from "./artistPageData";

const releasePath = `/lumen-tide/release/${TIDAL_HOURS.urlSlug}`;

const meta = {
  title: "Showcase/Release credits and lyrics",
  component: AppFrame,
  parameters: {
    layout: "fullscreen",
    ...recordingViewport,
    msw: {
      handlers: {
        auth: authAs(null),
        stripe: paymentsEnabled,
        artist: publicArtistHandlers(FULL_ARTIST),
      },
    },
    reactRouter: appRouting(releasePath),
  },
} satisfies Meta<typeof AppFrame>;

export default meta;
type Story = StoryObj<typeof meta>;

const openTrackMenu = async (canvasElement: HTMLElement, index = 0) => {
  const canvas = within(canvasElement);
  const menus = await canvas.findAllByRole("button", {
    name: "Track options",
  });
  await userEvent.click(menus[index]);
};

/**
 * The release page. Record a slow scroll from the cover down through the
 * track list to the credits. Open a track's "..." menu to show the
 * "View lyrics" item and the CC BY-SA licence link.
 */
export const ReleasePage: Story = {};

/** The track menu open on "Low Water", showing View lyrics and the licence. */
export const TrackMenuWithLicense: Story = {
  play: async ({ canvasElement }) => {
    await openTrackMenu(canvasElement);
  },
};

/** The lyrics modal open for "Low Water". Close it with Escape. */
export const LyricsOpen: Story = {
  play: async ({ canvasElement }) => {
    await openTrackMenu(canvasElement);
    await userEvent.click(await screen.findByText("View lyrics"));
  },
};

/** A single track's page, with its lyrics printed below the player. */
export const TrackPageWithLyrics: Story = {
  parameters: {
    reactRouter: appRouting(
      `${releasePath}/tracks/${TIDAL_HOURS.tracks[0].id}`
    ),
  },
};
