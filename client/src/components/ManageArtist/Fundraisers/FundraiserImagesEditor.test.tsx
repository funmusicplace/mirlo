import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { beforeEach, describe, expect, test, vi } from "vitest";

const { deleteImage, reorderImages } = vi.hoisted(() => ({
  deleteImage: vi.fn(),
  reorderImages: vi.fn(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { number?: number }) =>
      opts?.number ? `${key} ${opts.number}` : key,
  }),
}));
vi.mock("queries", () => ({
  useDeleteFundraiserImageMutation: () => ({
    mutateAsync: deleteImage,
    isPending: false,
  }),
  useInvalidateFundraisers: () => vi.fn(),
  useReorderFundraiserImagesMutation: () => ({
    mutateAsync: reorderImages,
    isPending: false,
  }),
}));
vi.mock("../SortableImagesEditor", () => ({
  default: ({
    images,
    uploadUrl,
    inputId,
    labels,
    onDelete,
    onReorder,
  }: any) => (
    <div
      data-testid="editor"
      data-upload-url={uploadUrl}
      data-input-id={inputId}
    >
      <span>{labels.first}</span>
      {images.map((image: { id: string }, i: number) => (
        <span key={image.id}>{labels.imageAlt(i + 1)}</span>
      ))}
      <button onClick={() => onDelete(images[0].id)}>delete</button>
      <button onClick={() => onReorder(["b", "a"])}>reorder</button>
    </div>
  ),
}));

import FundraiserImagesEditor from "./FundraiserImagesEditor";

const FUNDRAISER = {
  id: 7,
  images: [{ id: "a" }, { id: "b" }],
} as unknown as ManagedFundraiser;

describe("FundraiserImagesEditor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("uploads to the fundraiser and calls the first image the cover", () => {
    render(<FundraiserImagesEditor fundraiser={FUNDRAISER} />);
    expect(screen.getByTestId("editor")).toHaveAttribute(
      "data-upload-url",
      "manage/fundraisers/7/images"
    );
    expect(screen.getByText("coverImage")).toBeInTheDocument();
    expect(screen.getByText("imageAlt 2")).toBeInTheDocument();
  });

  test("deletes and reorders the fundraiser's images", async () => {
    render(<FundraiserImagesEditor fundraiser={FUNDRAISER} />);

    await userEvent.click(screen.getByText("delete"));
    expect(deleteImage).toHaveBeenCalledWith({
      fundraiserId: 7,
      fundraiserImageId: "a",
    });

    await userEvent.click(screen.getByText("reorder"));
    expect(reorderImages).toHaveBeenCalledWith({
      fundraiserId: 7,
      fundraiserImageIds: ["b", "a"],
    });
  });
});
