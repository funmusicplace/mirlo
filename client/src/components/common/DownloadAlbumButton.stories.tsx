import type { Meta, StoryObj } from "@storybook/react";
import { userEvent, within } from "@storybook/test";
import { http, HttpResponse } from "msw";

import { RELEASES } from "../../showcase/shared/fixtures";

import DownloadAlbumButton from "./DownloadAlbumButton";

/**
 * The download button for a release (or a single track) the listener owns.
 * It opens a picker of formats: FLAC, ALAC, WAV, Opus and three MP3 bitrates.
 * Picking one asks the API to generate the zip, then shows a Download button.
 */
const meta = {
  title: "Common/DownloadAlbumButton",
  component: DownloadAlbumButton,
  args: { trackGroup: RELEASES.tidal },
  parameters: {
    layout: "centered",
    msw: {
      handlers: {
        // Every format is already generated, so Download shows straight away
        generate: [
          http.get("*/v1/trackGroups/:id/generate", () =>
            HttpResponse.json({ result: true })
          ),
          http.get("*/v1/tracks/:id/generate", () =>
            HttpResponse.json({ result: true })
          ),
        ],
      },
    },
  },
} satisfies Meta<typeof DownloadAlbumButton>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The button, closed */
export const Default: Story = {};

/** As an icon only, as it sits under the cover on a release page */
export const IconOnly: Story = {
  args: { onlyIcon: true },
};

/** The format picker open. Click a format and the Download button appears. */
export const FormatPickerOpen: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = await canvas.findByTestId("download-button", undefined, {
      timeout: 5000,
    });
    await userEvent.click(button);
    // The modal renders in a portal outside the canvas
    await within(document.body).findByText("FLAC");
  },
};
