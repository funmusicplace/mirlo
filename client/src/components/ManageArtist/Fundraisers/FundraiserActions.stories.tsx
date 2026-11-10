import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";

import FundraiserActions from "./FundraiserActions";
import {
  STUDIO,
  VINYL,
  fundraiserMutationHandlers,
} from "./fundraiserStoryFixtures";

/**
 * What an artist can do with a fundraiser: see its pledges, charge them once
 * an all-or-nothing goal is met. Used on the release form and
 * the fundraiser edit page.
 */
const meta = {
  title: "Features/Fundraisers/FundraiserActions",
  component: FundraiserActions,
  parameters: {
    layout: "padded",
    msw: { handlers: { fundraiser: fundraiserMutationHandlers } },
  },
  args: {
    fundraiser: VINYL,
    amountRaised: VINYL.amountRaised,
  },
} satisfies Meta<typeof FundraiserActions>;

export default meta;
type Story = StoryObj<typeof meta>;

/** $3,125 pledged toward $5,000: nothing to charge yet */
export const BelowGoal: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("link", { name: "Pledges" })
    ).toBeInTheDocument();
    await expect(
      canvas.queryByRole("button", { name: "Charge pledges now" })
    ).not.toBeInTheDocument();
  },
};

export const GoalReached: Story = {
  args: { amountRaised: VINYL.goalAmount },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByRole("button", { name: "Charge pledges now" })
    ).toBeInTheDocument();
  },
};

export const NotAllOrNothing: Story = {
  args: {
    fundraiser: { ...STUDIO, status: "ACTIVE" },
    amountRaised: STUDIO.amountRaised,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("button", { name: "Mark fundraiser as done" })
    ).toBeInTheDocument();
    await expect(
      canvas.queryByRole("link", { name: "Pledges" })
    ).not.toBeInTheDocument();
  },
};

export const Complete: Story = {
  args: { fundraiser: { ...VINYL, status: "SUCCESSFUL" } },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).queryByRole("button", {
        name: "Charge pledges now",
      })
    ).not.toBeInTheDocument();
  },
};
