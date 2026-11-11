import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";

import FundraiserGauge from "./FundraiserGauge";

/** The large progress gauge on a fundraiser's page */
const meta = {
  title: "Features/Fundraisers/FundraiserGauge",
  component: FundraiserGauge,
  decorators: [
    (Story) => (
      <div className="w-[400px]">
        <Story />
      </div>
    ),
  ],
  parameters: { layout: "centered" },
  args: {
    amountRaised: 11429000,
    goalAmount: 20000000,
    currency: "eur",
    pledgeCount: 2155,
    endDate: "2026-12-31T23:59:59.000Z",
  },
} satisfies Meta<typeof FundraiserGauge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Started: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("progressbar", { name: "57% of the goal raised" })
    ).toBeInTheDocument();
    await expect(canvas.getByText("2,155")).toBeInTheDocument();
    await expect(canvas.getByText("57.1%")).toBeInTheDocument();
  },
};

export const NothingYet: Story = {
  args: { amountRaised: 0, pledgeCount: 0 },
};

export const PastTheGoal: Story = {
  args: { amountRaised: 24150000 },
};

/** Fundraisers counting release sales have no pledge count */
export const WithoutPledgeCount: Story = {
  args: { pledgeCount: undefined },
};

/** Big goals still fit: the amount shrinks as it gets longer */
export const Millions: Story = {
  args: {
    amountRaised: 1234567800,
    goalAmount: 2500000000,
    pledgeCount: 48210,
  },
};
