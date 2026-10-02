import type { Meta, StoryContext, StoryObj } from "@storybook/react";
import { userEvent, within } from "@storybook/test";
import { http, HttpResponse } from "msw";
import BulkTrackUploadPage from "pages/manage/bulk-track-upload/Index";
import React from "react";

import { pause, recordingViewport } from "../shared/helpers";

const SAMPLE_CSV_URL = "/showcase/Lumen Tide - catalogue.csv";

const bulkHandlers = [
  // No existing artists, so every release in the sheet shows as new
  http.get("*/v1/users/:userId/artists", () =>
    HttpResponse.json({ results: [] })
  ),
  http.post("*/v1/manage/bulkTrackUpload", async ({ request }) => {
    const body = (await request.json()) as {
      artists: { trackGroups: { tracks: unknown[] }[] }[];
    };
    const trackGroups = body.artists.flatMap((a) => a.trackGroups);
    // Long enough to see the "Uploading..." state in a recording
    await pause(1200);
    return HttpResponse.json({
      result: {
        artistsCreated: body.artists.length,
        trackGroupsCreated: trackGroups.length,
        tracksCreated: trackGroups.reduce((n, tg) => n + tg.tracks.length, 0),
        partialErrors: [],
      },
    });
  }),
];

const meta = {
  title: "Showcase/Bulk CSV upload",
  component: BulkTrackUploadPage,
  decorators: [
    (Story) => (
      <div className="mx-auto max-w-5xl px-8 py-6">
        <Story />
      </div>
    ),
  ],
  parameters: {
    layout: "fullscreen",
    ...recordingViewport,
    msw: { handlers: { bulk: bulkHandlers } },
  },
} satisfies Meta<typeof BulkTrackUploadPage>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Picks the sample catalogue CSV in the file input */
const uploadSampleCsv = async ({ canvasElement }: StoryContext) => {
  const input =
    canvasElement.querySelector<HTMLInputElement>('input[type="file"]');
  if (!input) throw new Error("CSV file input not found");
  const text = await (await fetch(SAMPLE_CSV_URL)).text();
  const csv = new File([text], "Lumen Tide - catalogue.csv", {
    type: "text/csv",
  });
  await userEvent.upload(input, csv);
  await within(canvasElement).findByText("Map CSV Columns");
};

/** Credits the Composer column as a track artist role, then continues */
const mapComposerAndContinue = async ({ canvasElement }: StoryContext) => {
  const canvas = within(canvasElement);
  const composerRow = (await canvas.findByText(/8\. Composer/)).closest("div");
  const select = composerRow?.querySelector("select");
  if (!select) throw new Error("Composer column select not found");
  await userEvent.selectOptions(select, "track_artist_role");
  await userEvent.click(
    await canvas.findByRole("button", { name: /Continue to Preview/ })
  );
  await canvas.findByText("Review Album Data");
};

/**
 * Start state for a live recording: the spreadsheet upload step. Click the
 * file input and pick `client/.storybook/public/showcase/Lumen Tide -
 * catalogue.csv` (13 tracks across three releases and two artists).
 */
export const UploadSpreadsheet: Story = {};

/**
 * The CSV has been read and its columns auto-matched to Mirlo fields. Record
 * setting the last column, "Composer", to "Track Artist Role (custom)", then
 * press "Continue to Preview".
 */
export const MapColumns: Story = {
  play: uploadSampleCsv,
};

/**
 * The preview: releases grouped by artist with every track, its credits and
 * ISRC. Record pressing "Upload Artist" on Lumen Tide, then on Ada Rivers,
 * until the "All artists uploaded" banner appears.
 */
export const ReviewReleases: Story = {
  play: async (context) => {
    await uploadSampleCsv(context);
    await mapComposerAndContinue(context);
  },
};

/**
 * End state: both artists uploaded, with the running totals and the "All
 * artists uploaded successfully" banner. Good as the closing shot.
 */
export const AllUploaded: Story = {
  play: async (context) => {
    await uploadSampleCsv(context);
    await mapComposerAndContinue(context);
    const canvas = within(context.canvasElement);
    for (let i = 0; i < 2; i++) {
      const [next] = await canvas.findAllByRole("button", {
        name: "Upload Artist",
      });
      await userEvent.click(next);
      await canvas.findByText(/Uploaded so far/, {}, { timeout: 5000 });
      await pause(1500);
    }
    await canvas.findByText(/All artists uploaded successfully/);
    window.scrollTo({ top: 0, behavior: "smooth" });
  },
};
