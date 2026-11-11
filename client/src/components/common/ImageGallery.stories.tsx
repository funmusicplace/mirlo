import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";

import {
  DRAFT_MERCH_EXAMPLE,
  merchImageFixture,
  VINYL_MERCH_EXAMPLE,
} from "../../../test/mocks";

import ImageGallery from "./ImageGallery";

/**
 * The image area of a public merch or fundraiser page: the selected image
 * large, with a row of thumbnails to switch between photos when there's more
 * than one.
 */
const meta = {
  title: "Common/ImageGallery",
  component: ImageGallery,
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <div className="max-w-[480px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ImageGallery>;

export default meta;
type Story = StoryObj<typeof meta>;

const mainImage = (canvasElement: HTMLElement, title: string) =>
  within(canvasElement).getByAltText(title);

/** No images yet: an empty square placeholder and no thumbnails. */
export const NoImages: Story = {
  args: { images: DRAFT_MERCH_EXAMPLE.images, alt: DRAFT_MERCH_EXAMPLE.title },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByRole("img")).not.toBeInTheDocument();
    await expect(canvas.queryAllByRole("button")).toHaveLength(0);
  },
};

/** One image: no thumbnail row. */
export const SingleImage: Story = {
  args: {
    images: [merchImageFixture("merch-vinyl.svg", 0)],
    alt: VINYL_MERCH_EXAMPLE.title,
  },
  play: async ({ canvasElement, args }) => {
    await expect(mainImage(canvasElement, args.alt)).toHaveAttribute(
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
  args: { images: VINYL_MERCH_EXAMPLE.images, alt: VINYL_MERCH_EXAMPLE.title },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const thumbnails = canvas.getAllByRole("button", { name: /Show image/ });
    await expect(thumbnails).toHaveLength(4);
    await expect(thumbnails[0]).toHaveAttribute("aria-pressed", "true");

    await userEvent.click(canvas.getByRole("button", { name: "Show image 3" }));

    await expect(mainImage(canvasElement, args.alt)).toHaveAttribute(
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
    alt: VINYL_MERCH_EXAMPLE.title,
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
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getAllByRole("button", { name: /Show image/ })
    ).toHaveLength(8);
  },
};

/**
 * A fundraiser's gallery: a 16:9 frame with the video as the first slide.
 * Images fill the frame, so the frame doesn't jump between slides.
 */
export const WithVideo: Story = {
  args: {
    aspect: "video",
    alt: "Vinyl fundraiser",
    video: {
      src: "https://www.youtube.com/embed/aqz-KE-bpKQ",
      title: "Fundraiser video",
    },
    images: [
      merchImageFixture("merch-vinyl.svg", 0),
      merchImageFixture("merch-poster.svg", 1),
    ],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTitle("Fundraiser video")).toBeInTheDocument();
    await expect(
      canvas.getByRole("button", { name: "Show video" })
    ).toHaveAttribute("aria-pressed", "true");

    await userEvent.click(canvas.getByRole("button", { name: "Show image 2" }));

    await expect(
      canvas.queryByTitle("Fundraiser video")
    ).not.toBeInTheDocument();
    await expect(canvas.getByAltText("Vinyl fundraiser")).toHaveAttribute(
      "src",
      "/showcase/merch-poster.svg"
    );
  },
};
