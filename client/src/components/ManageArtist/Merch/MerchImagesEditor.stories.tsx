import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, waitFor, within } from "@storybook/test";
import { useQuery } from "@tanstack/react-query";
import { delay, http, HttpResponse } from "msw";
import { queryManagedMerch } from "queries";

import { merchImageFixture, VINYL_MERCH_EXAMPLE } from "../../../../test/mocks";

import MerchImagesEditor from "./MerchImagesEditor";

const MERCH_ID = VINYL_MERCH_EXAMPLE.id;

const UPLOAD_ASSETS = [
  "merch-tshirt.svg",
  "fees-merch-cassette.svg",
  "fees-merch-tee.svg",
  "fees-merch-tote.svg",
];

type StoreOptions = {
  failDelete?: boolean;
  failReorder?: boolean;
  failUploadsAfter?: number;
};

const createImageStore = (initial: MerchImage[]) => {
  let images: MerchImage[] = [];
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
    http.get("*/v1/manage/merch/:merchId", () =>
      HttpResponse.json({
        result: { ...VINYL_MERCH_EXAMPLE, images: serialize() },
      })
    ),
    http.post("*/v1/manage/merch/:merchId/images", async () => {
      await delay(300);
      if (
        options.failUploadsAfter !== undefined &&
        uploads >= options.failUploadsAfter
      ) {
        return HttpResponse.json(
          { error: "Something went wrong" },
          { status: 500 }
        );
      }
      const file = UPLOAD_ASSETS[uploads % UPLOAD_ASSETS.length];
      const image = {
        ...merchImageFixture(file, images.length),
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
    http.put("*/v1/manage/merch/:merchId/images", async ({ request }) => {
      if (options.failReorder) {
        return HttpResponse.json(
          { error: "Something went wrong" },
          { status: 500 }
        );
      }
      const { merchImageIds } = (await request.json()) as {
        merchImageIds: string[];
      };
      images = merchImageIds.map((id) => images.find((i) => i.id === id)!);
      return HttpResponse.json({ results: serialize() });
    }),
    http.delete(
      "*/v1/manage/merch/:merchId/images/:merchImageId",
      ({ params }) => {
        if (options.failDelete) {
          return HttpResponse.json(
            { error: "Something went wrong" },
            { status: 500 }
          );
        }
        images = images.filter((i) => i.id !== params.merchImageId);
        return HttpResponse.json({ message: "Success" });
      }
    ),
  ];

  return { reset, handlers };
};

/**
 * Reads the merch through the same query as the manage merch page, so the
 * mutations' cache invalidation refreshes it like it does in the app.
 */
const EditorHarness = () => {
  const { data: merch, refetch } = useQuery(queryManagedMerch(MERCH_ID));
  if (!merch) {
    return null;
  }
  return <MerchImagesEditor merch={merch} reload={refetch} />;
};

const withStore = (initial: MerchImage[], options?: StoreOptions) => {
  const store = createImageStore(initial);
  return {
    loaders: [
      async () => {
        store.reset();
        return {};
      },
    ],
    parameters: { msw: { handlers: { merch: store.handlers(options) } } },
  };
};

const svgFile = (name: string) =>
  new File(
    [
      `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>`,
    ],
    name,
    { type: "image/svg+xml" }
  );

const imageTiles = (canvasElement: HTMLElement) =>
  within(canvasElement).queryAllByAltText(/^Merch image \d+$/);

const chooseFiles = (canvasElement: HTMLElement, files: File[]) => {
  const input = canvasElement.querySelector<HTMLInputElement>(
    "#merch-images-input"
  )!;
  // Not userEvent.upload: it pins `input.files`, and the editor clears the
  // input after reading it. A real FileList behaves like the file picker.
  const transfer = new DataTransfer();
  files.forEach((file) => transfer.items.add(file));
  input.files = transfer.files;
  input.dispatchEvent(new Event("change", { bubbles: true }));
};

const dragSecondImageToFront = async (canvasElement: HTMLElement) => {
  within(canvasElement).getAllByLabelText("Drag to reorder image")[1].focus();
  await userEvent.keyboard("[Space]");
  await userEvent.keyboard("[ArrowLeft]");
  await userEvent.keyboard("[Space]");
};

/**
 * The image list on the manage merch page: upload several photos (front,
 * back, inserts), reorder them, and delete them. The first image is the one
 * used in listings, previews and checkout.
 */
const meta = {
  title: "ManageArtist/Merch/MerchImagesEditor",
  component: EditorHarness,
  parameters: { layout: "padded" },
} satisfies Meta<typeof EditorHarness>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A new merch item: only the upload tile. */
export const NoImages: Story = {
  ...withStore([]),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByText("Add images");
    await expect(canvas.queryByText("Primary")).not.toBeInTheDocument();
    await expect(imageTiles(canvasElement)).toHaveLength(0);
  },
};

/** One image: it's the primary one and there's nothing to drag. */
export const SingleImage: Story = {
  ...withStore([merchImageFixture("merch-vinyl.svg", 0)]),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByText("Primary");
    await expect(
      canvas.queryByLabelText("Drag to reorder image")
    ).not.toBeInTheDocument();
    await expect(canvas.getByLabelText("Delete image")).toBeEnabled();
  },
};

/** The sleeve, insert, poster and tote of a record, each with a drag handle. */
export const SeveralImages: Story = {
  ...withStore(VINYL_MERCH_EXAMPLE.images),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => expect(imageTiles(canvasElement)).toHaveLength(4));
    await expect(canvas.getAllByText("Primary")).toHaveLength(1);
    await expect(
      canvas.getAllByLabelText("Drag to reorder image")
    ).toHaveLength(4);
  },
};

/**
 * Dragging the second image to the front makes it the primary image. Driven
 * with dnd-kit's keyboard controls (Space to pick up, arrow to move, Space to
 * drop), which work the same as dragging with the pointer.
 */
export const DragSecondImageToFront: Story = {
  ...withStore(VINYL_MERCH_EXAMPLE.images),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => expect(imageTiles(canvasElement)).toHaveLength(4));

    await dragSecondImageToFront(canvasElement);

    await waitFor(() =>
      expect(imageTiles(canvasElement)[0]).toHaveAttribute(
        "src",
        "/showcase/fees-merch-vinyl.svg"
      )
    );
    await expect(imageTiles(canvasElement)[1]).toHaveAttribute(
      "src",
      "/showcase/merch-vinyl.svg"
    );
  },
};

/** Deleting an image removes its tile. */
export const DeleteImage: Story = {
  ...withStore(VINYL_MERCH_EXAMPLE.images),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => expect(imageTiles(canvasElement)).toHaveLength(4));

    await userEvent.click(canvas.getAllByLabelText("Delete image")[2]);

    await waitFor(() => expect(imageTiles(canvasElement)).toHaveLength(3));
    await expect(
      canvasElement.querySelector('img[src="/showcase/merch-poster.svg"]')
    ).toBeNull();
  },
};

/**
 * Choosing two files uploads them one after the other. Their tiles show a
 * spinner until the optimize-image job poll (every 5s) reports them done.
 */
export const UploadSeveral: Story = {
  ...withStore([merchImageFixture("merch-vinyl.svg", 0)]),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByText("Primary");

    chooseFiles(canvasElement, [svgFile("back.svg"), svgFile("insert.svg")]);

    await waitFor(
      () => expect(canvas.getAllByLabelText("Delete image")).toHaveLength(3),
      { timeout: 5000 }
    );
    await waitFor(() => expect(imageTiles(canvasElement)).toHaveLength(3), {
      timeout: 10000,
    });
    await expect(canvas.getAllByText("Primary")).toHaveLength(1);
  },
};

/**
 * The second of three files fails. The first one still shows up and gets
 * processed, and the artist is told something went wrong.
 */
export const UploadPartlyFails: Story = {
  ...withStore([merchImageFixture("merch-vinyl.svg", 0)], {
    failUploadsAfter: 1,
  }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByText("Primary");

    chooseFiles(canvasElement, [
      svgFile("back.svg"),
      svgFile("insert.svg"),
      svgFile("poster.svg"),
    ]);

    await within(canvasElement.ownerDocument.body).findByText(
      "Couldn't upload the image"
    );
    await waitFor(
      () => expect(canvas.getAllByLabelText("Delete image")).toHaveLength(2),
      { timeout: 5000 }
    );
    await waitFor(() => expect(imageTiles(canvasElement)).toHaveLength(2), {
      timeout: 10000,
    });
  },
};

/**
 * A just-uploaded image can't be deleted until its optimize-image job is
 * done, or the job would write resized files after the image is gone.
 */
export const NoDeleteWhileProcessing: Story = {
  ...withStore([merchImageFixture("merch-vinyl.svg", 0)]),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByText("Primary");

    chooseFiles(canvasElement, [svgFile("back.svg")]);

    await waitFor(
      () => expect(canvas.getAllByLabelText("Delete image")).toHaveLength(2),
      { timeout: 5000 }
    );
    const [existing, uploaded] = canvas.getAllByLabelText("Delete image");
    await expect(existing).toBeEnabled();
    await expect(uploaded).toBeDisabled();

    await waitFor(
      () => expect(canvas.getAllByLabelText("Delete image")[1]).toBeEnabled(),
      { timeout: 10000 }
    );
  },
};

/** An upload whose optimize-image job hasn't finished yet. */
export const StillProcessing: Story = {
  ...withStore([
    merchImageFixture("merch-vinyl.svg", 0),
    {
      ...merchImageFixture("fees-merch-vinyl.svg", 1),
      url: [],
      sizes: {},
    },
  ]),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() =>
      expect(canvas.getAllByLabelText("Delete image")).toHaveLength(2)
    );
    await expect(imageTiles(canvasElement)).toHaveLength(1);
  },
};

/** A failed reorder puts the images back in their saved order. */
export const ReorderFails: Story = {
  ...withStore(VINYL_MERCH_EXAMPLE.images, { failReorder: true }),
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(imageTiles(canvasElement)).toHaveLength(4));

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

/** A failed delete keeps the image and tells the artist. */
export const DeleteFails: Story = {
  ...withStore(VINYL_MERCH_EXAMPLE.images, { failDelete: true }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => expect(imageTiles(canvasElement)).toHaveLength(4));

    await userEvent.click(canvas.getAllByLabelText("Delete image")[0]);

    await within(canvasElement.ownerDocument.body).findByText(
      "Couldn't delete the image"
    );
    await expect(imageTiles(canvasElement)).toHaveLength(4);
  },
};
