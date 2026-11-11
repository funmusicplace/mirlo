import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, waitFor, within } from "@storybook/test";
import { useQuery } from "@tanstack/react-query";
import { delay, http, HttpResponse } from "msw";
import { queryManagedFundraiser } from "queries";

import FundraiserImagesEditor from "./FundraiserImagesEditor";
import {
  VINYL,
  VINYL_IMAGES,
  fundraiserImageFixture,
} from "./fundraiserStoryFixtures";

type StoreOptions = { failReorder?: boolean };

const createImageStore = (initial: FundraiserImage[]) => {
  let images: FundraiserImage[] = [];
  let processing = new Set<string>();
  let uploads = 0;

  const reset = () => {
    images = initial.map((image) => ({ ...image }));
    processing = new Set();
    uploads = 0;
  };
  reset();

  const serialize = () =>
    images.map((image, position) =>
      processing.has(image.id)
        ? { ...image, position, url: [], sizes: {} }
        : { ...image, position }
    );

  const handlers = (options: StoreOptions = {}) => [
    http.get("*/v1/manage/fundraisers/:fundraiserId", () =>
      HttpResponse.json({ result: { ...VINYL, images: serialize() } })
    ),
    http.post("*/v1/manage/fundraisers/:fundraiserId/images", async () => {
      await delay(300);
      const image = {
        ...fundraiserImageFixture("cover-moss.svg", images.length),
        id: `uploaded-${uploads}`,
        imageId: `uploaded-image-${uploads}`,
      };
      uploads += 1;
      images.push(image);
      processing.add(image.id);
      return HttpResponse.json({
        result: { jobId: `job-${image.id}`, imageId: image.imageId },
      });
    }),
    http.get("*/v1/jobs", ({ request }) => {
      const ids = new URL(request.url).searchParams.getAll("ids");
      processing.clear();
      return HttpResponse.json({
        results: ids.map((jobId) => ({ jobId, jobStatus: "completed" })),
      });
    }),
    http.put(
      "*/v1/manage/fundraisers/:fundraiserId/images",
      async ({ request }) => {
        if (options.failReorder) {
          return HttpResponse.json(
            { error: "Something went wrong" },
            { status: 500 }
          );
        }
        const { fundraiserImageIds } = (await request.json()) as {
          fundraiserImageIds: string[];
        };
        images = fundraiserImageIds.map(
          (id) => images.find((i) => i.id === id)!
        );
        return HttpResponse.json({ results: serialize() });
      }
    ),
    http.delete(
      "*/v1/manage/fundraisers/:fundraiserId/images/:fundraiserImageId",
      ({ params }) => {
        images = images.filter((i) => i.id !== params.fundraiserImageId);
        return HttpResponse.json({ message: "Success" });
      }
    ),
  ];

  return { reset, handlers };
};

/**
 * Reads the fundraiser through the same query as the edit page, so the
 * mutations' cache invalidation refreshes it like it does in the app.
 */
const EditorHarness = () => {
  const { data: fundraiser } = useQuery(queryManagedFundraiser(VINYL.id));
  if (!fundraiser) {
    return null;
  }
  return <FundraiserImagesEditor fundraiser={fundraiser} />;
};

const withStore = (initial: FundraiserImage[], options?: StoreOptions) => {
  const store = createImageStore(initial);
  return {
    loaders: [
      async () => {
        store.reset();
        return {};
      },
    ],
    parameters: { msw: { handlers: { fundraiser: store.handlers(options) } } },
  };
};

const imageTiles = (canvasElement: HTMLElement) =>
  within(canvasElement).queryAllByAltText(/^Fundraiser image \d+$/);

const dragSecondImageToFront = async (canvasElement: HTMLElement) => {
  within(canvasElement).getAllByLabelText("Drag to reorder image")[1].focus();
  await userEvent.keyboard("[Space]");
  await userEvent.keyboard("[ArrowLeft]");
  await userEvent.keyboard("[Space]");
};

/**
 * The images at the top of a fundraiser's page, on its edit page. The first
 * one is the cover, also used when the page is shared.
 */
const meta = {
  title: "Features/Fundraisers/FundraiserImagesEditor",
  component: EditorHarness,
  parameters: { layout: "padded" },
} satisfies Meta<typeof EditorHarness>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A new fundraiser: only the upload tile. */
export const NoImages: Story = {
  ...withStore([]),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByText("Add images");
    await expect(canvas.queryByText("Cover")).not.toBeInTheDocument();
  },
};

export const SeveralImages: Story = {
  ...withStore(VINYL_IMAGES),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => expect(imageTiles(canvasElement)).toHaveLength(3));
    await expect(canvas.getAllByText("Cover")).toHaveLength(1);
  },
};

/** Dragging the second image to the front makes it the cover. */
export const MakeSecondImageTheCover: Story = {
  ...withStore(VINYL_IMAGES),
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(imageTiles(canvasElement)).toHaveLength(3));

    await dragSecondImageToFront(canvasElement);

    await waitFor(() =>
      expect(imageTiles(canvasElement)[0]).toHaveAttribute(
        "src",
        "/showcase/cover-tidal.svg"
      )
    );
  },
};

export const DeleteImage: Story = {
  ...withStore(VINYL_IMAGES),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => expect(imageTiles(canvasElement)).toHaveLength(3));

    await userEvent.click(canvas.getAllByLabelText("Delete image")[1]);

    await waitFor(() => expect(imageTiles(canvasElement)).toHaveLength(2));
  },
};

/**
 * The new image shows a spinner until the optimize-image job poll (every
 * 5s) reports it done.
 */
export const UploadImage: Story = {
  ...withStore([fundraiserImageFixture("merch-vinyl.svg", 0)]),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByText("Cover");

    const input = canvasElement.querySelector<HTMLInputElement>(
      "#fundraiser-images-input"
    )!;
    const transfer = new DataTransfer();
    transfer.items.add(
      new File(
        [
          `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>`,
        ],
        "van.svg",
        { type: "image/svg+xml" }
      )
    );
    input.files = transfer.files;
    input.dispatchEvent(new Event("change", { bubbles: true }));

    await waitFor(
      () => expect(canvas.getAllByLabelText("Delete image")).toHaveLength(2),
      { timeout: 5000 }
    );
    await waitFor(() => expect(imageTiles(canvasElement)).toHaveLength(2), {
      timeout: 10000,
    });
  },
};

/** A failed reorder puts the images back and tells the artist. */
export const ReorderFails: Story = {
  ...withStore(VINYL_IMAGES, { failReorder: true }),
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(imageTiles(canvasElement)).toHaveLength(3));

    await dragSecondImageToFront(canvasElement);

    await within(canvasElement.ownerDocument.body).findByText(
      "Couldn't reorder the images"
    );
    await expect(imageTiles(canvasElement)[0]).toHaveAttribute(
      "src",
      "/showcase/merch-vinyl.svg"
    );
  },
};
