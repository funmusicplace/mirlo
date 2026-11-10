import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";

import { ARTIST, STUDIO, VAN, VINYL } from "./fundraiserStoryFixtures";
import ManageFundraisersList from "./ManageFundraisersList";

/**
 * The compact list of an artist's fundraisers at the top of the Support tab.
 * Each row links to the fundraiser's edit page.
 */
const meta = {
  title: "Features/Fundraisers/ManageFundraisersList",
  component: ManageFundraisersList,
  parameters: { layout: "padded" },
  args: {
    artistId: ARTIST.id,
    currency: "usd",
    fundraisers: [VINYL, VAN, STUDIO],
  },
} satisfies Meta<typeof ManageFundraisersList>;

export default meta;
type Story = StoryObj<typeof meta>;

/** One running, one just started, one funded */
export const Several: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByRole("listitem")).toHaveLength(3);
    await expect(
      canvas.getByRole("link", { name: `Edit ${VINYL.name}` })
    ).toHaveAttribute(
      "href",
      `/manage/artists/${ARTIST.id}/fundraisers/${VINYL.id}`
    );
    await expect(canvas.getByText("Funded")).toBeInTheDocument();
    await expect(
      canvas.getByText("$3,125.00 out of $5,000.00 raised")
    ).toBeInTheDocument();
    await expect(canvas.getAllByRole("progressbar")).toHaveLength(3);
  },
};

export const One: Story = {
  args: { fundraisers: [VINYL] },
};

/** A long name wraps rather than pushing the amounts off screen */
export const LongName: Story = {
  args: {
    fundraisers: [
      {
        ...VINYL,
        name: "Press Tidal Hours on 180g sea-glass blue vinyl with a gatefold sleeve and hand-stamped labels",
      },
    ],
  },
  parameters: { viewport: { defaultViewport: "mobile1" } },
};

/** With no fundraisers the list takes no space on the Support tab */
export const Empty: Story = {
  args: { fundraisers: [] },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).queryByRole("list")
    ).not.toBeInTheDocument();
  },
};
