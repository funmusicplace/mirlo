import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, within } from "@storybook/test";

import { fundraiserMutationHandlers } from "./fundraiserStoryFixtures";
import RemoveFundraiserButton from "./RemoveFundraiserButton";

/**
 * Removes a fundraiser, at the bottom of the fundraiser edit page and the
 * release form's fundraiser section. With pledges it cancels them, after
 * asking.
 */
const meta = {
  title: "Features/Fundraisers/RemoveFundraiserButton",
  component: RemoveFundraiserButton,
  parameters: {
    layout: "padded",
    msw: { handlers: { fundraiser: fundraiserMutationHandlers } },
  },
  args: { fundraiserId: 7, pledgeCount: 0, onRemoved: fn() },
} satisfies Meta<typeof RemoveFundraiserButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NoPledges: Story = {
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByRole("button", { name: "Remove fundraiser" })
    ).toBeInTheDocument();
  },
};

export const WithPledges: Story = {
  args: { pledgeCount: 3 },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByRole("button", { name: "Cancel fundraiser" })
    ).toBeInTheDocument();
  },
};
