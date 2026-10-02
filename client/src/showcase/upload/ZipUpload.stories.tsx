import type { Meta, StoryContext, StoryObj } from "@storybook/react";
import { userEvent, within } from "@storybook/test";
import UploadProgressPanel from "components/common/UploadProgressPanel";
import ManageTrackGroupPage from "pages/manage/artists/{artistId}/release/{trackGroupId}/Index";
import React from "react";

import { artistHandlers } from "../../../.storybook/handlers";
import { manageArtistPage, layoutHandlers } from "../shared/AppFrame";
import { SHOWCASE_ARTIST } from "../shared/fixtures";
import { recordingViewport } from "../shared/helpers";

import {
  EMPTY_RELEASE,
  SAMPLE_ZIP_URL,
  releasePageHandlers,
  resetZipUploadState,
  zipUploadHandlers,
} from "./zipUploadMocks";

const meta = {
  title: "Showcase/Zip upload",
  component: ManageTrackGroupPage,
  loaders: [resetZipUploadState],
  decorators: [
    (Story) => (
      <>
        <Story />
        {/* Lives in App.tsx in the real app */}
        <UploadProgressPanel />
      </>
    ),
  ],
  parameters: {
    layout: "fullscreen",
    ...recordingViewport,
    msw: {
      handlers: {
        artist: artistHandlers(SHOWCASE_ARTIST),
        release: zipUploadHandlers,
        page: releasePageHandlers,
        layout: layoutHandlers,
      },
    },
    reactRouter: manageArtistPage(
      "release/:trackGroupId",
      `release/${EMPTY_RELEASE.id}`
    ),
  },
} satisfies Meta<typeof ManageTrackGroupPage>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Fetches the sample zip from .storybook/public and drops it on the zip input */
const dropSampleZip = async ({ canvasElement }: StoryContext) => {
  const canvas = within(canvasElement);
  const input = await canvas.findByLabelText(
    "Import album from zip file",
    {},
    { timeout: 5000 }
  );
  const blob = await (await fetch(SAMPLE_ZIP_URL)).blob();
  const zip = new File([blob], "Lumen Tide - Tidal Hours.zip", {
    type: "application/zip",
  });
  await userEvent.upload(input, zip);
  await within(document.body).findByText(
    "Tracks found",
    {},
    { timeout: 10000 }
  );
};

/**
 * Start state for a live recording: a brand new, empty release with the
 * "Import from ZIP" drop zone at the top. Drag
 * `client/.storybook/public/showcase/Lumen Tide - Tidal Hours.zip` onto the
 * dashed box, review the preview, press Import and keep recording while the
 * six tracks upload and the page fills in. Everything is mocked, so it can be
 * replayed as often as needed (reload the story to reset).
 */
export const EmptyRelease: Story = {};

/**
 * The zip has already been read in the browser: the import preview lists the
 * album title, artist, release date and description from the FLAC tags, all
 * six tracks in order, the cover found in the zip and a lyric booklet PDF.
 * Record scrolling through the preview, then press Import.
 */
export const ZipPreview: Story = {
  play: dropSampleZip,
};

/**
 * Just after pressing Import: tracks upload one at a time with progress bars
 * (in the page and the floating upload panel), the title, description and
 * cover fill in, and each new track row shows "still processing" before
 * flipping to done. A full run takes about 40 seconds, so start recording
 * when the story loads.
 */
export const Importing: Story = {
  play: async (context) => {
    await dropSampleZip(context);
    const modal = within(document.body);
    await userEvent.click(await modal.findByRole("button", { name: "Import" }));
  },
};
