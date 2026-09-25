import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, waitFor, within } from "@storybook/test";
import { http, HttpResponse } from "msw";

import { TRACK_GROUP_EXAMPLE } from "../../../../test/mocks";

import UploadMusicModal from "./UploadMusicModal";

const DRAFT_ALBUM: TrackGroup = {
  ...TRACK_GROUP_EXAMPLE,
  id: 99,
  title: "",
  urlSlug: "hidden-draft-album",
  tracks: [],
};

const UPLOADED_TRACK = {
  id: 501,
  title: "demo",
  status: "preview",
  artistId: 1,
  trackGroupId: DRAFT_ALBUM.id,
  order: 1,
  isPreview: true,
  audio: {
    url: "",
    createdAt: "1999-09-09T09:09:09Z",
    duration: 0.1,
    uploadState: "SUCCESS",
    originalFilename: "demo.wav",
  },
} as Track;

const draftHandler = http.get("*/v1/manage/artists/:artistId/drafts", () =>
  HttpResponse.json({ result: DRAFT_ALBUM })
);

const uploadHandlers = [
  http.post("*/v1/manage/tracks", () =>
    HttpResponse.json({
      result: UPLOADED_TRACK,
      uploadUrl: "https://storage.example/upload/501",
    })
  ),
  http.put("https://storage.example/*", () => new HttpResponse(null)),
  http.put("*/v1/manage/tracks/:trackId/process", () =>
    HttpResponse.json({ result: {} })
  ),
  http.get("*/v1/manage/tracks/:trackId", () =>
    HttpResponse.json({ result: UPLOADED_TRACK })
  ),
];

function silentWav(name: string) {
  const samples = 800;
  const buffer = new ArrayBuffer(44 + samples);
  const view = new DataView(buffer);
  const writeString = (offset: number, str: string) =>
    [...str].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)));
  writeString(0, "RIFF");
  view.setUint32(4, 36 + samples, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, 8000, true); // sample rate
  view.setUint32(28, 8000, true); // byte rate
  view.setUint16(32, 1, true); // block align
  view.setUint16(34, 8, true); // bits per sample
  writeString(36, "data");
  view.setUint32(40, samples, true);
  new Uint8Array(buffer, 44).fill(128);
  return new File([buffer], name, { type: "audio/wav" });
}

const meta = {
  title: "TextEditor/UploadMusicModal",
  component: UploadMusicModal,
  args: {
    open: true,
    artistId: 1,
    onClose: fn(),
    onTrackReady: fn(),
  },
  parameters: {
    msw: { handlers: { draft: draftHandler, upload: uploadHandlers } },
  },
} satisfies Meta<typeof UploadMusicModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const UploadUnavailable: Story = {
  parameters: {
    msw: {
      handlers: {
        draft: http.get("*/v1/manage/artists/:artistId/drafts", () =>
          HttpResponse.json({ error: "Something went wrong" }, { status: 500 })
        ),
      },
    },
  },
};

export const SongUploaded: Story = {
  play: async ({ canvasElement }) => {
    // Modal portals into document.body, outside the story's canvas
    const body = within(canvasElement.ownerDocument.body);
    await body.findByText("Upload new track");

    const input = await waitFor(() => {
      const el =
        canvasElement.ownerDocument.querySelector<HTMLInputElement>(
          "#input-track-files"
        );
      if (!el) throw new Error("File input not rendered yet");
      return el;
    });
    // Not userEvent.upload: it pins `input.files` so form.reset() can't clear
    // it, and BulkTrackUpload then re-enqueues the file forever. Setting a
    // real FileList behaves like a browser file picker.
    const transfer = new DataTransfer();
    transfer.items.add(silentWav("demo.wav"));
    input.files = transfer.files;
    input.dispatchEvent(new Event("change", { bubbles: true }));

    await expect(
      await body.findByLabelText("Track title", {}, { timeout: 5000 })
    ).toBeInTheDocument();
  },
};

export const SongTitled: Story = {
  play: async (context) => {
    await SongUploaded.play?.(context);
    const body = within(context.canvasElement.ownerDocument.body);
    await userEvent.type(body.getByLabelText("Track title"), "My new song");
    await expect(
      body.getByRole("button", { name: "Add this track" })
    ).toBeEnabled();
  },
};
