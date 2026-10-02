import type { Meta, StoryObj } from "@storybook/react";
import PostWidgetPage from "pages/widget/post/{id}/Index";

import {
  OPEN_WEB_POST,
  widgetHandlers,
} from "../../../showcase/openWeb/openWebFixtures";
import { authAs } from "../../../showcase/shared/helpers";
import {
  clearPlayerQueue,
  noPageScroll,
  widgetRoute,
} from "../widgetStoryUtils";

/**
 * The embeddable post widget, as served at /widget/post/:id: a post's
 * featured image and title with the songs attached to it.
 */
const meta = {
  title: "Widget/PostWidget",
  component: PostWidgetPage,
  beforeEach: clearPlayerQueue,
  decorators: [noPageScroll],
  parameters: {
    layout: "fullscreen",
    msw: { handlers: { auth: authAs(null), widget: widgetHandlers } },
  },
} satisfies Meta<typeof PostWidgetPage>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A Lumen Tide post with three attached songs */
export const Default: Story = {
  parameters: { reactRouter: widgetRoute("post", OPEN_WEB_POST.id) },
};
