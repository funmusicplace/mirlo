import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { beforeEach, describe, expect, test, vi } from "vitest";

const { snackbar, uploadFile } = vi.hoisted(() => ({
  snackbar: vi.fn(),
  uploadFile: vi.fn(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock("state/SnackbarContext", () => ({ useSnackbar: () => snackbar }));
vi.mock("services/api", () => ({ default: { uploadFile } }));
vi.mock("components/Artist/ArtistButtons", () => ({
  ArtistButton: React.forwardRef(
    ({ startIcon, onlyIcon, ...props }: any, ref: any) => (
      <button ref={ref} {...props} />
    )
  ),
}));

import SortableImagesEditor, {
  SortableImagesEditorLabels,
} from "./SortableImagesEditor";

const LABELS: SortableImagesEditorLabels = {
  title: "Images",
  description: "Shown at the top",
  add: "Add images",
  first: "Cover",
  imageAlt: (number) => `Image ${number}`,
  deleteImage: "Delete image",
  dragToReorder: "Drag to reorder image",
  uploadFailed: "Upload failed",
  deleteFailed: "Delete failed",
  reorderFailed: "Reorder failed",
};

const image = (id: string) => ({ id, sizes: { 300: `/${id}.png` } });

const renderEditor = (
  props: Partial<React.ComponentProps<typeof SortableImagesEditor>> = {}
) => {
  const callbacks = {
    reload: vi.fn(),
    onReorder: vi.fn().mockResolvedValue(undefined),
    onDelete: vi.fn().mockResolvedValue(undefined),
  };
  render(
    <SortableImagesEditor
      images={[image("a"), image("b")]}
      uploadUrl="manage/things/1/images"
      inputId="things-images-input"
      labels={LABELS}
      isPending={false}
      {...callbacks}
      {...props}
    />
  );
  return callbacks;
};

describe("SortableImagesEditor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("marks only the first image", () => {
    renderEditor();
    expect(screen.getByAltText("Image 1")).toHaveAttribute("src", "/a.png");
    expect(screen.getByAltText("Image 2")).toHaveAttribute("src", "/b.png");
    expect(screen.getAllByText("Cover")).toHaveLength(1);
  });

  test("only shows drag handles when there's more than one image", () => {
    renderEditor({ images: [image("a")] });
    expect(
      screen.queryByLabelText("Drag to reorder image")
    ).not.toBeInTheDocument();
  });

  test("deletes an image", async () => {
    const { onDelete } = renderEditor();
    await userEvent.click(screen.getAllByLabelText("Delete image")[1]);
    expect(onDelete).toHaveBeenCalledWith("b");
  });

  test("tells the artist when a delete fails", async () => {
    renderEditor({ onDelete: vi.fn().mockRejectedValue(new Error("nope")) });
    await userEvent.click(screen.getAllByLabelText("Delete image")[0]);
    await waitFor(() =>
      expect(snackbar).toHaveBeenCalledWith("Delete failed", {
        type: "warning",
      })
    );
  });

  test("can't delete while another change is saving", () => {
    renderEditor({ isPending: true });
    screen
      .getAllByLabelText("Delete image")
      .forEach((button) => expect(button).toBeDisabled());
  });

  test("uploads each chosen file to the upload URL", async () => {
    uploadFile.mockResolvedValue({ result: { jobId: "job-1" } });
    const { reload } = renderEditor();
    const files = [
      new File(["x"], "front.png", { type: "image/png" }),
      new File(["y"], "back.png", { type: "image/png" }),
    ];

    fireEvent.change(screen.getByLabelText("Add images"), {
      target: { files },
    });

    await waitFor(() => expect(reload).toHaveBeenCalled());
    expect(uploadFile).toHaveBeenCalledTimes(2);
    expect(uploadFile).toHaveBeenCalledWith(
      "manage/things/1/images",
      [files[0]],
      undefined,
      "POST"
    );
  });

  test("tells the artist when an upload fails", async () => {
    uploadFile.mockRejectedValue(new Error("too big"));
    renderEditor();

    fireEvent.change(screen.getByLabelText("Add images"), {
      target: { files: [new File(["x"], "front.png", { type: "image/png" })] },
    });

    await waitFor(() =>
      expect(snackbar).toHaveBeenCalledWith("Upload failed", {
        type: "warning",
      })
    );
  });
});
