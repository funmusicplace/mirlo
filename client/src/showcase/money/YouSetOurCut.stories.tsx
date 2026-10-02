import type { Meta, StoryObj } from "@storybook/react";
import { fireEvent, userEvent, within } from "@storybook/test";
import { merge } from "lodash";
import { http, HttpResponse } from "msw";
import CustomizeArtistPage from "pages/manage/artists/{artistId}/customize/Index";
import ManageTrackGroupPage from "pages/manage/artists/{artistId}/release/{trackGroupId}/Index";

import { artistHandlers } from "../../../.storybook/handlers";
import { manageArtistPage, layoutHandlers } from "../shared/AppFrame";
import { RELEASES, SHOWCASE_ARTIST_WITH_RELEASES } from "../shared/fixtures";
import {
  autoConfirm,
  pause,
  recordingViewport,
  scrollToElement,
} from "../shared/helpers";

let serverArtist: Artist = SHOWCASE_ARTIST_WITH_RELEASES;

const customizeHandlers = [
  http.put("*/v1/manage/artists/:artistId", async ({ request }) => {
    const body = (await request.json()) as Partial<Artist>;
    // The API merges `properties`, so the artist's colours survive a save.
    serverArtist = merge({}, serverArtist, body, { id: serverArtist.id });
    return HttpResponse.json({ result: serverArtist });
  }),
  http.post("*/v1/manage/artists/:artistId/applyPlatformFee", () =>
    HttpResponse.json({ result: { success: true } })
  ),
  http.get("*/v1/artists/testExistence", () =>
    HttpResponse.json({ result: { exists: false } })
  ),
];

const LICENSES = [{ id: 1, short: "copyright", name: "All rights reserved" }];

const release: TrackGroup = {
  ...RELEASES.tidal,
  platformPercent: 7,
  isGettable: true,
  catalogNumber: "LT-004",
};

const releaseHandlers = [
  http.get("*/v1/manage/trackGroups/:trackGroupId", () =>
    HttpResponse.json({ result: release })
  ),
  http.put("*/v1/manage/trackGroups/:trackGroupId", () =>
    HttpResponse.json({ result: release })
  ),
  http.get("*/v1/manage/trackGroups/:trackGroupId/recommendedTrackGroups", () =>
    HttpResponse.json({ results: [] })
  ),
  http.get("*/v1/trackGroups/:trackGroupId/supporters/", () =>
    HttpResponse.json({
      results: [],
      total: 0,
      totalAmount: 0,
      totalSupporters: 0,
      totalPledges: 0,
    })
  ),
  http.get("*/v1/licenses", () => HttpResponse.json({ results: LICENSES })),
  http.get("*/v1/tags", () => HttpResponse.json({ results: [] })),
  http.get("*/v1/manage/tracks/:trackId", ({ params }) =>
    HttpResponse.json({
      result: release.tracks.find((t) => String(t.id) === params.trackId),
    })
  ),
];

/**
 * Artists decide how much of each sale goes to Mirlo, all the way down to
 * 0%. The default lives on the artist's Customize page, with a button to
 * apply it to everything they sell.
 */
const meta = {
  title: "Showcase/You set our cut",
  component: CustomizeArtistPage,
  parameters: {
    layout: "fullscreen",
    ...recordingViewport,
    msw: {
      handlers: {
        // Before `artist`, so `artists/testExistence` isn't caught by its
        // `artists/:artistSlug` handler.
        customize: customizeHandlers,
        artist: artistHandlers(() => serverArtist),
        layout: layoutHandlers,
      },
    },
    reactRouter: manageArtistPage("customize"),
  },
  beforeEach: () => {
    serverArtist = SHOWCASE_ARTIST_WITH_RELEASES;
    return autoConfirm();
  },
} satisfies Meta<typeof CustomizeArtistPage>;

export default meta;
type Story = StoryObj<typeof meta>;

const findFeeSlider = async (canvasElement: HTMLElement) => {
  const canvas = within(canvasElement);
  const label = await canvas.findByText("Default platform cut");
  await scrollToElement(label, 110);
  const slider = canvasElement.querySelector<HTMLInputElement>(
    'input[type="range"][name="defaultPlatformFee"]'
  );
  return { canvas, slider };
};

/**
 * Clean start, scrolled to the "Default platform cut" control (7%). Record
 * yourself dragging the slider (or typing) down to 0%, then press "Apply to
 * all releases..." for the "Platform cut applied everywhere" snackbar.
 */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    await findFeeSlider(canvasElement);
  },
};

/**
 * Hands-free: the slider glides from 7% to 0% (the pill changes from
 * "Sustain" through "Solidarity" to "None"), saves, then applies the new cut
 * to the whole catalogue and the success snackbar appears.
 */
export const SlideToZero: Story = {
  play: async ({ canvasElement }) => {
    const { canvas, slider } = await findFeeSlider(canvasElement);
    if (!slider) return;
    await pause(1200);
    for (let percent = 6; percent >= 0; percent--) {
      fireEvent.change(slider, { target: { value: String(percent) } });
      await pause(260);
    }
    fireEvent.mouseUp(slider);
    await pause(900);
    await userEvent.click(
      canvas.getByRole("button", {
        name: "Apply to all releases, merch, subscriptions, and tips",
      })
    );
  },
};

/**
 * The same control on a single release's edit page, under "Price and such",
 * for setting a different cut on one album. Record dragging it to 0%.
 */
export const OnOneRelease: Story = {
  render: () => <ManageTrackGroupPage />,
  parameters: {
    msw: { handlers: { release: releaseHandlers } },
    reactRouter: manageArtistPage(
      "release/:trackGroupId",
      `release/${release.id}`
    ),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const heading = await canvas.findByRole("heading", { name: "Pricing" });
    await scrollToElement(heading, 110);
  },
};
