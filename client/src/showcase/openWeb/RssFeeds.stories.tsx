import type { Meta, StoryObj } from "@storybook/react";
import { http, HttpResponse } from "msw";
import ReleasesPage from "pages/releases/Index";
import { reactRouterParameters } from "storybook-addon-remix-react-router";

import { RELEASES } from "../shared/fixtures";
import { authAs, recordingViewport } from "../shared/helpers";

import { OPEN_WEB_ARTIST } from "./openWebFixtures";

const TAGS = [
  "ambient",
  "folk",
  "tape loops",
  "harmonium",
  "field recordings",
  "drone",
  "post-rock",
  "lo-fi",
  "chamber pop",
  "experimental",
];

const rssHandlers = [
  http.get("*/v1/trackGroups", () =>
    HttpResponse.json({
      results: Object.values(RELEASES),
      total: Object.values(RELEASES).length,
    })
  ),
  http.get("*/v1/artists/:artistSlug", () =>
    HttpResponse.json({ result: OPEN_WEB_ARTIST })
  ),
  http.get("*/v1/tags", () =>
    HttpResponse.json({
      results: TAGS.map((tag) => ({ tag })),
    })
  ),
];

const meta = {
  title: "Showcase/RSS feeds",
  component: ReleasesPage,
  parameters: {
    layout: "fullscreen",
    ...recordingViewport,
    msw: { handlers: { auth: authAs(null), rss: rssHandlers } },
    reactRouter: reactRouterParameters({ routing: { path: "/releases" } }),
  },
} satisfies Meta<typeof ReleasesPage>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The Explore page. Record hovering the RSS icon to the right of the
 * licence filter ("RSS feed" tooltip). The link itself points at the API's
 * ?format=rss feed, which isn't served under Storybook, so cut before the
 * new tab opens.
 */
export const NewReleasesFeed: Story = {};

/**
 * Explore narrowed to the "ambient" tag: the same RSS icon now gives a feed
 * of just that tag's new releases.
 */
export const TagFeed: Story = {
  parameters: {
    reactRouter: reactRouterParameters({
      location: { searchParams: { tag: "ambient" } },
      routing: { path: "/releases" },
    }),
  },
};
