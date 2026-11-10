import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "@storybook/test";

import FundraiserForm from "./FundraiserForm";
import {
  ARTIST,
  VAN,
  VINYL,
  asManaged,
  fundraiserMutationHandlers,
} from "./fundraiserStoryFixtures";

/**
 * The body of the fundraiser edit page: progress, actions, linked releases
 * and the fields an artist can change.
 */
const meta = {
  title: "Features/Fundraisers/FundraiserForm",
  component: FundraiserForm,
  parameters: {
    layout: "padded",
    msw: { handlers: { fundraiser: fundraiserMutationHandlers } },
  },
  args: {
    artistId: ARTIST.id,
    fundraiser: asManaged(VAN),
    currency: "usd",
    onRemoved: fn(),
  },
} satisfies Meta<typeof FundraiserForm>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Just created from the Support tab, with no release */
export const NewFundraiser: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const save = canvas.getByRole("button", { name: "Save fundraiser" });
    await expect(save).toBeDisabled();

    const goal = canvas.getByLabelText("Goal");
    await userEvent.clear(goal);
    await userEvent.type(goal, "9000");
    await expect(save).not.toBeDisabled();
    await userEvent.click(save);
    await expect(
      await canvas.findByText("Fundraiser saved")
    ).toBeInTheDocument();
  },
};

/** Linked to a release, with pledges coming in */
export const WithPledges: Story = {
  args: { fundraiser: asManaged(VINYL) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("link", { name: "Tidal Hours" })
    ).toBeInTheDocument();
    await expect(canvas.getByLabelText("Is it all or nothing?")).toBeDisabled();
  },
};

export const Funded: Story = {
  args: {
    fundraiser: asManaged({
      ...VINYL,
      status: "SUCCESSFUL",
      amountRaised: 540000,
    }),
  },
};
