import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";

import {
  DRAFT_MERCH_EXAMPLE,
  merchImageFixture,
  VINYL_MERCH_EXAMPLE,
} from "../../../test/mocks";

import MerchImageGallery from "./MerchImageGallery";

/**
 * The image area of a public merch page: the selected image large, with a
 * row of thumbnails to switch between photos when there's more than one.
 */
const meta = {
  title: "Merch/MerchImageGallery",
  component: MerchImageGallery,
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 480 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof MerchImageGallery>;

export default meta;
type Story = StoryObj<typeof meta>;

const mainImage = (canvasElement: HTMLElement, title: string) =>
  within(canvasElement).getByAltText(title);

/** No images yet: an empty square placeholder and no thumbnails. */
export const NoImages: Story = {
  args: { merch: DRAFT_MERCH_EXAMPLE },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByRole("img")).not.toBeInTheDocument();
    await expect(canvas.queryAllByRole("button")).toHaveLength(0);
  },
};

/** One image: no thumbnail row. */
export const SingleImage: Story = {
  args: {
    merch: {
      ...VINYL_MERCH_EXAMPLE,
      images: [merchImageFixture("merch-vinyl.svg", 0)],
    },
  },
  play: async ({ canvasElement, args }) => {
    await expect(mainImage(canvasElement, args.merch.title)).toHaveAttribute(
      "src",
      "/showcase/merch-vinyl.svg"
    );
    await expect(within(canvasElement).queryAllByRole("button")).toHaveLength(
      0
    );
  },
};

/** Several images: the first is shown, and thumbnails switch between them. */
export const SeveralImages: Story = {
  args: { merch: VINYL_MERCH_EXAMPLE },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const thumbnails = canvas.getAllByRole("button", { name: /Show image/ });
    await expect(thumbnails).toHaveLength(4);
    await expect(thumbnails[0]).toHaveAttribute("aria-pressed", "true");

    await userEvent.click(canvas.getByRole("button", { name: "Show image 3" }));

    await expect(mainImage(canvasElement, args.merch.title)).toHaveAttribute(
      "src",
      "/showcase/merch-poster.svg"
    );
    await expect(
      canvas.getByRole("button", { name: "Show image 3" })
    ).toHaveAttribute("aria-pressed", "true");
    await expect(thumbnails[0]).toHaveAttribute("aria-pressed", "false");
  },
};

/** Enough photos to wrap the thumbnail row onto a second line. */
export const ManyImages: Story = {
  args: {
    merch: {
      ...VINYL_MERCH_EXAMPLE,
      images: [
        "merch-vinyl.svg",
        "fees-merch-vinyl.svg",
        "merch-poster.svg",
        "merch-tote.svg",
        "merch-tshirt.svg",
        "fees-merch-cassette.svg",
        "fees-merch-tee.svg",
        "fees-merch-tote.svg",
      ].map((file, i) => merchImageFixture(file, i)),
    },
  },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getAllByRole("button", { name: /Show image/ })
    ).toHaveLength(8);
  },
};
