import type { Meta, StoryObj } from "@storybook/react";
import {
  clearPlayerQueue,
  noPageScroll,
  widgetRoute,
} from "components/Widget/widgetStoryUtils";

import {
  OPEN_WEB_LABEL,
  widgetHandlers,
} from "../../../../showcase/openWeb/openWebFixtures";
import { authAs } from "../../../../showcase/shared/helpers";

import LabelWidgetPage from "./Index";

/**
 * The embeddable label widget, as served at /widget/label/:id: a playlist of
 * songs from across the label's roster.
 */
const meta = {
  title: "Widget/LabelWidget",
  component: LabelWidgetPage,
  beforeEach: clearPlayerQueue,
  decorators: [noPageScroll],
  parameters: {
    layout: "fullscreen",
    msw: { handlers: { auth: authAs(null), widget: widgetHandlers } },
  },
} satisfies Meta<typeof LabelWidgetPage>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Saltmarsh Records' playlist: two songs from each of three releases */
export const Default: Story = {
  parameters: { reactRouter: widgetRoute("label", OPEN_WEB_LABEL.id) },
};
