import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";

import FundraiserProgressCircle from "./FundraiserProgressCircle";

/**
 * How much of a fundraiser's goal has been raised. The filled part uses the
 * artist's button colour.
 */
const meta = {
  title: "Features/Fundraisers/FundraiserProgressCircle",
  component: FundraiserProgressCircle,
  parameters: { layout: "centered" },
  args: { amountRaised: 831000, goalAmount: 2500000 },
} satisfies Meta<typeof FundraiserProgressCircle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Started: Story = {
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByRole("progressbar", {
        name: "33% of the goal raised",
      })
    ).toBeInTheDocument();
  },
};

export const NothingYet: Story = { args: { amountRaised: 0 } };

export const PastTheGoal: Story = { args: { amountRaised: 3100000 } };

/** The size used at the top of the fundraiser edit page */
export const Large: Story = { args: { size: 48 } };

/** Uses the artist's button colour when one is set */
export const ArtistColour: Story = {
  decorators: [
    (Story) => (
      <div style={{ ["--mi-button-color" as string]: "#2a9d8f" }}>
        <Story />
      </div>
    ),
  ],
};
