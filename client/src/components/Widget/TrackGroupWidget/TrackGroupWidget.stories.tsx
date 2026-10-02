import type { Meta, StoryObj } from "@storybook/react";
import TrackGroupWidgetPage from "pages/widget/trackgroup/{id}/Index";

import { widgetHandlers } from "../../../showcase/openWeb/openWebFixtures";
import { RELEASES } from "../../../showcase/shared/fixtures";
import { authAs } from "../../../showcase/shared/helpers";
import {
  clearPlayerQueue,
  noPageScroll,
  widgetRoute,
} from "../widgetStoryUtils";

const RELEASE = RELEASES.tidal;

/**
 * The embeddable release widget, as served at /widget/trackGroup/:id and
 * embedded on third-party sites. `?variant=` picks the layout. Each one fills
 * its frame, so they look stretched when opened on their own at full size.
 * The "Embed or share" picker previews these stories in its iframe.
 */
const meta = {
  title: "Widget/TrackGroupWidget",
  component: TrackGroupWidgetPage,
  beforeEach: clearPlayerQueue,
  decorators: [noPageScroll],
  parameters: {
    layout: "fullscreen",
    msw: { handlers: { auth: authAs(null), widget: widgetHandlers } },
  },
} satisfies Meta<typeof TrackGroupWidgetPage>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Card layout: cover, title and tracklist (230px tall when embedded) */
export const Card: Story = {
  parameters: { reactRouter: widgetRoute("trackGroup", RELEASE.id, "card") },
};

/** Compact strip layout, without the tracklist (140px) */
export const Compact: Story = {
  parameters: {
    reactRouter: widgetRoute("trackGroup", RELEASE.id, "compact"),
  },
};

/** Strip with tracklist layout (230px) */
export const Strip: Story = {
  parameters: { reactRouter: widgetRoute("trackGroup", RELEASE.id, "strip") },
};
