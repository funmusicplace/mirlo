import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import React from "react";

import { ARTIST_EXAMPLE } from "../../../../test/mocks";

import PostTierSelector from "./PostTierSelector";

const tier = (
  overrides: Partial<ArtistSubscriptionTier>
): ArtistSubscriptionTier => ({
  id: 1,
  artistId: ARTIST_EXAMPLE.id,
  artist: ARTIST_EXAMPLE,
  name: "follow",
  description: "",
  interval: "MONTH",
  isDefaultTier: false,
  platformPercent: 7,
  images: [],
  ...overrides,
});

const TIERS = [
  tier({ id: 1, name: "follow", isDefaultTier: true }),
  tier({ id: 2, name: "Supporter", minAmount: 500 }),
  tier({ id: 3, name: "Superfan", minAmount: 1500 }),
];

const Stateful: React.FC<{
  tiers: ArtistSubscriptionTier[];
  initial: string[];
}> = ({ tiers, initial }) => {
  const [value, setValue] = React.useState(initial);
  return (
    <div className="max-w-md">
      <PostTierSelector
        tiers={tiers}
        value={value}
        onChange={setValue}
        currency="usd"
      />
      <pre data-testid="value" className="mt-4 text-xs">
        {JSON.stringify(value)}
      </pre>
    </div>
  );
};

const meta: Meta<typeof Stateful> = {
  title: "Features/Posts/PostTierSelector",
  component: Stateful,
  args: { tiers: TIERS, initial: [] },
};

export default meta;
type Story = StoryObj<typeof Stateful>;

export const AllTiers: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("radio", { name: "All" })).toBeChecked();
    for (const box of canvas.getAllByRole("checkbox")) {
      await expect(box).toBeChecked();
    }

    await userEvent.click(canvas.getByText("Paid only"));
    await expect(
      canvas.getByRole("checkbox", { name: /follow/ })
    ).not.toBeChecked();
    await expect(canvas.getByTestId("value")).toHaveTextContent('["2","3"]');

    await userEvent.click(canvas.getByText("Free only"));
    await expect(canvas.getByTestId("value")).toHaveTextContent('["1"]');
    await expect(
      canvas.getByRole("checkbox", { name: /follow/ })
    ).toBeDisabled();

    await userEvent.click(canvas.getByRole("checkbox", { name: /Supporter/ }));
    await userEvent.click(canvas.getByRole("checkbox", { name: /Superfan/ }));
    await expect(canvas.getByRole("radio", { name: "All" })).toBeChecked();
    await expect(canvas.getByTestId("value")).toHaveTextContent("[]");
  },
};

export const CustomSelection: Story = {
  args: { initial: ["3"] },
};

export const OnlyPaidTiers: Story = {
  args: { tiers: TIERS.slice(1) },
};

export const EveryTierListed: Story = {
  args: { initial: ["1", "2", "3"] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("radio", { name: "All" })).toBeChecked();
  },
};
