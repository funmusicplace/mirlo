import type { Meta, StoryObj } from "@storybook/react";
import { userEvent, within } from "@storybook/test";
import { merge } from "lodash";
import { http, HttpResponse } from "msw";
import CustomizeArtistPage from "pages/manage/artists/{artistId}/customize/Index";

import { artistHandlers } from "../../../.storybook/handlers";
import { manageArtistPage, layoutHandlers } from "../shared/AppFrame";
import { SHOWCASE_ARTIST_WITH_RELEASES } from "../shared/fixtures";
import { pause, recordingViewport, scrollToElement } from "../shared/helpers";

import { SHOWCASE_LABEL } from "./moneyFixtures";

const ARTIST: Artist = {
  ...SHOWCASE_ARTIST_WITH_RELEASES,
  artistLabels: [SHOWCASE_LABEL],
  paymentToUserId: undefined,
};

let serverArtist: Artist = ARTIST;

const handlers = [
  http.put("*/v1/manage/artists/:artistId", async ({ request }) => {
    const body = (await request.json()) as Partial<Artist>;
    // The API merges `properties`, so the artist's colours survive a save.
    serverArtist = merge({}, serverArtist, body, { id: serverArtist.id });
    return HttpResponse.json({ result: serverArtist });
  }),
  http.get("*/v1/manage/artists/:artistId/labels", () =>
    HttpResponse.json({ results: [SHOWCASE_LABEL] })
  ),
  http.get("*/v1/artists/testExistence", () =>
    HttpResponse.json({ result: { exists: false } })
  ),
];

/**
 * An artist on a label picks who gets paid for their sales: themselves, or
 * the label. It's at the bottom of the artist's Customize page, next to the
 * label relationship.
 */
const meta = {
  title: "Showcase/Choose who gets paid",
  component: CustomizeArtistPage,
  parameters: {
    layout: "fullscreen",
    ...recordingViewport,
    msw: {
      handlers: {
        // Before `artist`, so `artists/testExistence` isn't caught by its
        // `artists/:artistSlug` handler.
        receiver: handlers,
        artist: artistHandlers(() => serverArtist),
        layout: layoutHandlers,
      },
    },
    reactRouter: manageArtistPage("customize"),
  },
  beforeEach: () => {
    serverArtist = ARTIST;
  },
} satisfies Meta<typeof CustomizeArtistPage>;

export default meta;
type Story = StoryObj<typeof meta>;

const findReceiver = async (canvasElement: HTMLElement) => {
  const canvas = within(canvasElement);
  // The customise page is long and slow to settle; allow it time to load
  const select = await canvas.findByLabelText(
    "Who receives payments for this artist?",
    undefined,
    { timeout: 10000 }
  );
  await scrollToElement(select, 360);
  return { canvas, select };
};

/**
 * Clean start: payments go to the artist. Record choosing "Driftwood Records"
 * and pressing Save; the "Payment receiver updated" snackbar shows and the
 * label appears as the receiver (press its x to switch back).
 */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    await findReceiver(canvasElement);
  },
};

/** Hands-free: picks the label, saves, and the snackbar confirms it. */
export const PayTheLabel: Story = {
  play: async ({ canvasElement }) => {
    const { canvas, select } = await findReceiver(canvasElement);
    await pause(1000);
    await userEvent.selectOptions(select, String(SHOWCASE_LABEL.labelUserId));
    await pause(700);
    const section = select.closest("div")?.parentElement ?? canvasElement;
    await userEvent.click(
      within(section as HTMLElement).getByRole("button", { name: "Save" })
    );
    await canvas.findByText("Payment receiver updated");
  },
};
