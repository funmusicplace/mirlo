import type { Meta, StoryObj } from "@storybook/react";
import { http, HttpResponse } from "msw";
import HomePage from "pages/home/Index";
import { DEFAULT_INSTANCE_SETTINGS } from "utils/instanceSettings";

import { POSTS } from "../artistPage/artistPageData";
import { AppFrame, appRouting } from "../shared/AppFrame";
import { RELEASES, SHOWCASE_ARTIST_WITH_RELEASES } from "../shared/fixtures";
import { authAs, recordingViewport } from "../shared/helpers";

const MIRLO_LOGOS = {
  logo: { url: "/Logo-With-Wordmark.svg", width: 119, height: 40 },
  mobileLogo: {
    url: "/Logo_Mirlo_Transparent_RedCircle.svg",
    width: 285,
    height: 285,
  },
};

const TAGS: Tag[] = ["ambient", "folk", "field recordings", "post-rock"].map(
  (tag) => ({ tag })
);

const instanceHandler = (settings: Partial<InstanceSettings>) =>
  http.get("*/v1/instance", () =>
    HttpResponse.json({
      result: { ...DEFAULT_INSTANCE_SETTINGS, ...settings },
    })
  );

const homeHandlers = (settings: Partial<InstanceSettings>) => ({
  auth: authAs(null),
  instance: instanceHandler(settings),
  home: [
    http.get("*/v1/trackGroups", () =>
      HttpResponse.json({ results: Object.values(RELEASES) })
    ),
    http.get("*/v1/trackGroups/topSold", () =>
      HttpResponse.json({ results: Object.values(RELEASES) })
    ),
    http.get("*/v1/tags", () => HttpResponse.json({ results: TAGS })),
    http.get("*/v1/posts", () => HttpResponse.json({ results: POSTS })),
    http.get("*/v1/settings/featuredArtists", () =>
      HttpResponse.json({ result: [SHOWCASE_ARTIST_WITH_RELEASES] })
    ),
    http.get("*/v1/settings/instanceArtist", () =>
      HttpResponse.json({ result: null })
    ),
  ],
});

const homeRouting = appRouting("/", [{ path: "", element: <HomePage /> }]);

/**
 * The home page as a visitor who isn't logged in sees it, with the header
 * logo. Use it to check the header logo in browsers the team doesn't use
 * day to day, such as Safari on iOS.
 */
const meta = {
  title: "Showcase/Home page",
  component: AppFrame,
  parameters: {
    layout: "fullscreen",
    ...recordingViewport,
    msw: { handlers: homeHandlers({ ...MIRLO_LOGOS, tintLogo: true }) },
    reactRouter: homeRouting,
  },
} satisfies Meta<typeof AppFrame>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The Mirlo logos tinted with the button color, as on mirlo.space */
export const TintedLogo: Story = {};

/** The same logos with their own colors */
export const UntintedLogo: Story = {
  parameters: {
    msw: { handlers: homeHandlers({ ...MIRLO_LOGOS, tintLogo: false }) },
  },
};

/** No logo uploaded: the header shows the instance name */
export const InstanceName: Story = {
  parameters: {
    msw: { handlers: homeHandlers({ logo: null, mobileLogo: null }) },
  },
};
