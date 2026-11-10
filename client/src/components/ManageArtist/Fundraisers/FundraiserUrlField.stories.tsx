import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import { http, HttpResponse } from "msw";

import {
  ARTIST,
  VAN,
  fundraiserMutationHandlers,
} from "./fundraiserStoryFixtures";
import FundraiserUrlField from "./FundraiserUrlField";

/**
 * The line under the fundraiser's name on its edit page. Clicking it opens a
 * pop-up to change the URL slug, which saves straight away.
 */
const meta = {
  title: "Features/Fundraisers/FundraiserUrlField",
  component: FundraiserUrlField,
  parameters: {
    layout: "padded",
    msw: { handlers: { fundraiser: fundraiserMutationHandlers } },
  },
  args: {
    artist: ARTIST,
    fundraiser: { id: VAN.id, urlSlug: "a-van", isPublic: false },
  },
} satisfies Meta<typeof FundraiserUrlField>;

export default meta;
type Story = StoryObj<typeof meta>;

const openModal = async (canvasElement: HTMLElement) => {
  await userEvent.click(
    within(canvasElement).getByRole("button", { name: /\/fundraiser\/a-van$/ })
  );
  return within(
    await within(document.body).findByRole("dialog", { name: "Fundraiser URL" })
  );
};

export const ChangeUrl: Story = {
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByText(/\/tidal-hours\/fundraiser\/a-van$/)
    ).toBeInTheDocument();
    const modal = await openModal(canvasElement);
    const input = modal.getByLabelText("Fundraiser URL");
    await userEvent.clear(input);
    await userEvent.type(input, "our-van");
    await userEvent.click(modal.getByRole("button", { name: "Save URL" }));
    await expect(
      await within(document.body).findByText("URL saved")
    ).toBeInTheDocument();
  },
};

/** Another of the artist's fundraisers already uses the URL */
export const UrlTaken: Story = {
  parameters: {
    msw: {
      handlers: {
        fundraiser: http.put("*/v1/manage/fundraisers/:fundraiserId", () =>
          HttpResponse.json({ error: "taken" }, { status: 400 })
        ),
      },
    },
  },
  play: async ({ canvasElement }) => {
    const modal = await openModal(canvasElement);
    await userEvent.click(modal.getByRole("button", { name: "Save URL" }));
    await expect(
      await modal.findByText(
        "Another of your fundraisers already uses this URL."
      )
    ).toBeInTheDocument();
  },
};

/** Public: changing the URL breaks links people may have shared */
export const Public: Story = {
  args: { fundraiser: { id: VAN.id, urlSlug: "a-van", isPublic: true } },
  play: async ({ canvasElement }) => {
    const modal = await openModal(canvasElement);
    await expect(
      modal.getByText(/will break existing links/)
    ).toBeInTheDocument();
  },
};
