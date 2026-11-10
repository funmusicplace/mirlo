import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";

import FundraiserPublicButton from "./FundraiserPublicButton";
import {
  ARTIST,
  VAN,
  fundraiserMutationHandlers,
} from "./fundraiserStoryFixtures";

/**
 * Shows or hides the fundraiser's public page, saving straight away. While
 * the fundraiser is private its page 404s.
 */
const meta = {
  title: "Features/Fundraisers/FundraiserPublicButton",
  component: FundraiserPublicButton,
  parameters: {
    layout: "padded",
    msw: { handlers: { fundraiser: fundraiserMutationHandlers } },
  },
  args: {
    artist: ARTIST,
    fundraiser: { id: VAN.id, urlSlug: "a-van", isPublic: false },
  },
} satisfies Meta<typeof FundraiserPublicButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Private: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Make public" }));
    await expect(
      await within(document.body).findByText("The fundraiser is now public")
    ).toBeInTheDocument();
  },
};

export const Public: Story = {
  args: { fundraiser: { id: VAN.id, urlSlug: "a-van", isPublic: true } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("button", { name: "Make private" })
    ).toBeInTheDocument();
    await expect(
      canvas.getByRole("link", { name: "View the fundraiser's page" })
    ).toHaveAttribute("href", "/tidal-hours/fundraiser/a-van");
  },
};
