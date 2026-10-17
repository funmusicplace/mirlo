import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, waitFor, within } from "@storybook/test";
import { http, HttpResponse } from "msw";
import React from "react";

import TextEditor from ".";

const PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAuMBg3X9f88AAAAASUVORK5CYII=";
const UPLOADED_SRC = "/showcase/cover-dusk.svg";
const UPLOADED_IMAGE_ID = "img-uploaded";

const uploadHandler = http.put("*/v1/manage/posts/:postId/images", () =>
  HttpResponse.json({
    result: {
      src: UPLOADED_SRC,
      jobId: UPLOADED_SRC,
      imageId: UPLOADED_IMAGE_ID,
    },
  })
);

const pngFile = () =>
  new File(
    [Uint8Array.from(atob(PNG_BASE64), (c) => c.charCodeAt(0))],
    "cover.png",
    { type: "image/png" }
  );

const EditorWithSavedHtml = (
  props: React.ComponentProps<typeof TextEditor>
) => {
  const [html, setHtml] = React.useState(props.value);
  return (
    <div>
      <TextEditor
        {...props}
        onChange={(value) => {
          setHtml(value);
          props.onChange(value);
        }}
      />
      <pre
        data-testid="saved-html"
        className="mt-4 whitespace-pre-wrap break-all text-xs"
      >
        {html}
      </pre>
    </div>
  );
};

const findEditor = (canvasElement: HTMLElement) =>
  waitFor(() => {
    const el = canvasElement.querySelector<HTMLElement>(".ProseMirror");
    if (!el) throw new Error("Editor not rendered yet");
    return el;
  });

const findUploadedImage = (editor: HTMLElement) =>
  waitFor(() => {
    const img = editor.querySelector(`img[src="${UPLOADED_SRC}"]`);
    if (!img) throw new Error("Uploaded image not in the editor yet");
    return img;
  });

const meta = {
  title: "TextEditor/TextEditor",
  component: TextEditor,
  render: (args) => <EditorWithSavedHtml {...args} />,
  args: {
    value: "",
    postId: 1,
    artistId: 1,
    onChange: fn(),
    reloadImages: fn(),
  },
  parameters: {
    msw: { handlers: { upload: uploadHandler } },
  },
} satisfies Meta<typeof TextEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

export const TextOnly: Story = {
  args: {
    value:
      '<h2>Tour diary</h2><p>We played <strong>three</strong> nights in a row.</p><ul><li>Lisbon</li><li>Porto</li></ul><p>Tickets on <a href="https://example.com">our site</a>.</p>',
  },
};

export const WithImageIds: Story = {
  args: {
    value: `<p>Before the image.</p><p><img src="${UPLOADED_SRC}" data-image-id="${UPLOADED_IMAGE_ID}"></p><p><img src="/showcase/cover-moss.svg"></p><p>After the image.</p>`,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const editor = await findEditor(canvasElement);
    await expect(await findUploadedImage(editor)).toHaveAttribute(
      "data-image-id",
      UPLOADED_IMAGE_ID
    );
    await expect(
      editor.querySelector('img[src="/showcase/cover-moss.svg"]')
    ).not.toHaveAttribute("data-image-id");

    await userEvent.click(canvas.getByText("After the image."));
    await userEvent.keyboard("!");
    await waitFor(() =>
      expect(canvas.getByTestId("saved-html").textContent).toContain(
        `data-image-id="${UPLOADED_IMAGE_ID}"`
      )
    );
  },
};

export const PastedImage: Story = {
  play: async ({ canvasElement, args }) => {
    const editor = await findEditor(canvasElement);
    editor.focus();
    const clipboardData = new DataTransfer();
    clipboardData.setData(
      "text/html",
      `<p><img src="data:image/png;base64,${PNG_BASE64}"></p>`
    );
    editor.dispatchEvent(
      new ClipboardEvent("paste", {
        clipboardData,
        bubbles: true,
        cancelable: true,
      })
    );

    await expect(await findUploadedImage(editor)).toHaveAttribute(
      "data-image-id",
      UPLOADED_IMAGE_ID
    );
    await waitFor(() => expect(args.reloadImages).toHaveBeenCalled());
  },
};

export const InsertImageButton: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Add image" }));

    const dialogEl = await within(canvasElement.ownerDocument.body).findByRole(
      "dialog"
    );
    const input =
      dialogEl.querySelector<HTMLInputElement>('input[type="file"]');
    if (!input) throw new Error("File input not rendered");
    const transfer = new DataTransfer();
    transfer.items.add(pngFile());
    input.files = transfer.files;
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await userEvent.click(
      within(dialogEl).getByRole("button", { name: "Add image" })
    );

    const editor = await findEditor(canvasElement);
    await expect(await findUploadedImage(editor)).toHaveAttribute(
      "data-image-id",
      UPLOADED_IMAGE_ID
    );
  },
};

const TRACK_WIDGET_SRC = "https://mirlo.space/widget/track/1";
const TRACK_GROUP_WIDGET_SRC = "https://mirlo.space/widget/trackGroup/1";

export const WithWidgetEmbeds: Story = {
  args: {
    value: `<p>New single:</p><iframe src="${TRACK_WIDGET_SRC}" height="137" width="700"></iframe><p>And the whole album:</p><iframe src="${TRACK_GROUP_WIDGET_SRC}" height="371" width="700"></iframe>`,
  },
  play: async ({ canvasElement }) => {
    const editor = await findEditor(canvasElement);
    await waitFor(() => {
      const srcs = Array.from(editor.querySelectorAll("iframe")).map((el) =>
        el.getAttribute("src")
      );
      expect(srcs).toEqual([TRACK_WIDGET_SRC, TRACK_GROUP_WIDGET_SRC]);
    });
  },
};
