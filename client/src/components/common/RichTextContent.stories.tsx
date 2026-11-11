import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";

import RichTextContent from "./RichTextContent";

/**
 * Shows HTML written in the rich text editor: post bodies and fundraiser
 * descriptions. Embedded videos and players load when scrolled into view.
 */
const meta = {
  title: "UI/RichTextContent",
  component: RichTextContent,
  parameters: { layout: "padded" },
  args: {
    html: [
      "<h2>Why we're pressing vinyl</h2>",
      "<p>Help us press <strong>300 copies</strong> on sea-glass blue vinyl.</p>",
      "<ul><li>Gatefold sleeve</li><li>Hand-stamped labels</li></ul>",
      "<blockquote>You're only charged if we hit the goal.</blockquote>",
    ].join(""),
  },
} satisfies Meta<typeof RichTextContent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Formatting: Story = {
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByRole("heading", {
        name: "Why we're pressing vinyl",
      })
    ).toBeInTheDocument();
  },
};

export const WithVideo: Story = {
  args: {
    html: '<p>Watch the studio diary:</p><iframe src="https://player.vimeo.com/video/76979871" allowfullscreen="true"></iframe>',
  },
};
