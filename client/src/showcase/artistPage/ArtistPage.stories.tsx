import type { Meta, StoryObj } from "@storybook/react";
import { userEvent, within } from "@storybook/test";

import { AppFrame, appRouting } from "../shared/AppFrame";
import { recordingViewport, authAs } from "../shared/helpers";

import {
  banner,
  FULL_ARTIST,
  THEMES,
  paymentsEnabled,
  publicArtistHandlers,
  withTheme,
} from "./artistPageData";

const handlersFor = (artist: Artist) => ({
  auth: authAs(null),
  stripe: paymentsEnabled,
  artist: publicArtistHandlers(artist),
});

/**
 * Lumen Tide's public artist page, as a fan who isn't logged in sees it. The
 * tabs, release covers and merch items are real links, so you can click
 * around while recording.
 */
const meta = {
  title: "Showcase/Artist page",
  component: AppFrame,
  parameters: {
    layout: "fullscreen",
    ...recordingViewport,
    msw: { handlers: handlersFor(FULL_ARTIST) },
    reactRouter: appRouting("/lumen-tide"),
  },
} satisfies Meta<typeof AppFrame>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The hero shot: banner, avatar, bio, pinned announcement, links in the tab
 * bar and the releases grid. Record a slow scroll down the grid, then click
 * "Tour dates" in the header, then the Merch tab.
 */
export const Hero: Story = {};

/**
 * The merch tab: a vinyl LP, a t-shirt with sizes and colours, a tote and a
 * tour poster. Click the t-shirt to open its page and buy dialog.
 */
export const MerchTab: Story = {
  parameters: { reactRouter: appRouting("/lumen-tide/merch") },
};

/**
 * The same page in a dark "Ember Rooms" theme. Record the same framing as
 * `Hero` and cut between them.
 */
export const EmberRoomsTheme: Story = {
  parameters: {
    msw: {
      handlers: handlersFor(
        withTheme(FULL_ARTIST, THEMES.ember, {
          background: banner("banner-ember.svg"),
        })
      ),
    },
  },
};

/** The same page in a soft green "Moss Choir" theme, for a third cut. */
export const MossChoirTheme: Story = {
  parameters: {
    msw: {
      handlers: handlersFor(
        withTheme(FULL_ARTIST, THEMES.moss, {
          background: banner("banner-moss.svg"),
        })
      ),
    },
  },
};

/**
 * Custom tab names and order: "Shop" first, then "Records" and "Notes from
 * the boathouse", set from the customise page.
 */
export const CustomTabs: Story = {
  parameters: {
    msw: {
      handlers: handlersFor(
        withTheme(FULL_ARTIST, THEMES.tide, {
          titles: {
            merch: "Shop",
            releases: "Records",
            posts: "From the boathouse",
            support: "Join the crew",
          },
          tabOrder: ["merch", "releases", "support", "posts", "roster"],
        })
      ),
    },
  },
};

/** The hero page at phone width, for vertical (Reels / Stories) cuts. */
export const HeroOnPhone: Story = {
  parameters: { viewport: { defaultViewport: "phone" } },
};

/** The tour dates dialog, opened from "Dates" in the artist header. */
export const TourDates: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      await canvas.findByRole("button", { name: /dates/i })
    );
  },
};
