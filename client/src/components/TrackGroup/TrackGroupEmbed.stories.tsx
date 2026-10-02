import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import { reactRouterParameters } from "storybook-addon-remix-react-router";

import { widgetHandlers } from "../../showcase/openWeb/openWebFixtures";
import { useLocalWidgetPreviews } from "../../showcase/openWeb/widgetPreviews";
import { RELEASES, SHOWCASE_ARTIST } from "../../showcase/shared/fixtures";
import { authAs } from "../../showcase/shared/helpers";

import TrackGroupEmbed from "./TrackGroupEmbed";

const RELEASE = RELEASES.tidal;

/**
 * The "Embed or share" button on a release page. It opens a picker with the
 * release link, a choice of widget layouts with a live preview, and the
 * iframe code to paste into a website. The preview loads the
 * Widget/TrackGroupWidget stories in place of the real app.
 */
const meta = {
  title: "TrackGroup/TrackGroupEmbed",
  component: TrackGroupEmbed,
  args: { trackGroup: RELEASE },
  decorators: [useLocalWidgetPreviews],
  parameters: {
    layout: "centered",
    msw: { handlers: { auth: authAs(null), widget: widgetHandlers } },
    // The button reads the artist from the route, as on the release page
    reactRouter: reactRouterParameters({
      location: {
        pathParams: {
          artistId: String(SHOWCASE_ARTIST.urlSlug),
          trackGroupId: String(RELEASE.urlSlug),
        },
      },
      routing: { path: "/:artistId/release/:trackGroupId" },
    }),
  },
} satisfies Meta<typeof TrackGroupEmbed>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The share icon button, closed */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    await within(canvasElement).findByTitle(/embed or share/i, undefined, {
      timeout: 5000,
    });
  },
};

/** The picker open on the card layout, with its preview and iframe code */
export const PickerOpen: Story = {
  play: async ({ canvasElement }) => {
    const button = await within(canvasElement).findByTitle(
      /embed or share/i,
      undefined,
      { timeout: 5000 }
    );
    await userEvent.click(button);
    // The modal renders in a portal outside the canvas
    const modal = within(document.body);
    await expect(
      await modal.findByRole("radiogroup", undefined, { timeout: 5000 })
    ).toBeInTheDocument();
  },
};
