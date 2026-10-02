import type { Meta, StoryObj } from "@storybook/react";
import { userEvent, within } from "@storybook/test";
import { http, HttpResponse } from "msw";
import BulkPricingPage from "pages/manage/artists/{artistId}/pricing/Index";

import { artistHandlers } from "../../../.storybook/handlers";
import { manageArtistPage, layoutHandlers } from "../shared/AppFrame";
import { RELEASES, SHOWCASE_ARTIST_WITH_RELEASES } from "../shared/fixtures";
import { pause, recordingViewport } from "../shared/helpers";

import { RELEASES_WITH_THUMBS, SHOWCASE_MERCH } from "./moneyFixtures";

let releases: TrackGroup[] = [];
let merch: Merch[] = [];

const pricingHandlers = [
  http.get("*/v1/manage/artists/:artistId/trackGroups", () =>
    HttpResponse.json({ results: releases })
  ),
  http.get("*/v1/manage/artists/:artistId/merch", () =>
    HttpResponse.json({ results: merch })
  ),
  http.put("*/v1/manage/trackGroups/:id", async ({ params, request }) => {
    const body = (await request.json()) as Partial<TrackGroup>;
    releases = releases.map((r) =>
      String(r.id) === params.id ? { ...r, ...body } : r
    );
    return HttpResponse.json({
      result: releases.find((r) => String(r.id) === params.id),
    });
  }),
  http.put("*/v1/manage/merch/:id", async ({ params, request }) => {
    const body = (await request.json()) as Partial<Merch>;
    merch = merch.map((m) => (m.id === params.id ? { ...m, ...body } : m));
    return HttpResponse.json({
      result: merch.find((m) => m.id === params.id),
    });
  }),
];

/**
 * Every release and merch item's price on one page, at
 * /manage/artists/:artistId/pricing. Prices save row by row.
 */
const meta = {
  title: "Showcase/Bulk edit prices",
  component: BulkPricingPage,
  parameters: {
    layout: "fullscreen",
    ...recordingViewport,
    msw: {
      handlers: {
        artist: artistHandlers(SHOWCASE_ARTIST_WITH_RELEASES),
        layout: layoutHandlers,
        pricing: pricingHandlers,
      },
    },
    reactRouter: manageArtistPage("pricing"),
  },
  beforeEach: () => {
    releases = RELEASES_WITH_THUMBS;
    merch = SHOWCASE_MERCH;
  },
} satisfies Meta<typeof BulkPricingPage>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Clean start for a live recording: change a few prices (try $7 -> $5 on
 * "Moss Choir", then the vinyl) and press Save on each row. Every save shows
 * the "Price saved" snackbar.
 */
export const Default: Story = {};

const setPrice = async (
  canvas: ReturnType<typeof within>,
  label: string,
  price: string
) => {
  const input = await canvas.findByLabelText(label);
  input.scrollIntoView({ block: "center", behavior: "smooth" });
  await pause(400);
  await userEvent.clear(input);
  await userEvent.type(input, price, { delay: 120 });
  await pause(300);
  const row = input.closest("form") as HTMLElement;
  await userEvent.click(within(row).getByRole("button", { name: "Save" }));
  await pause(1200);
};

/**
 * Hands-free: drops two release prices and the vinyl price, saving each row
 * so the "Price saved" snackbar pops up. Start recording, then reload.
 */
export const EditingPrices: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await pause(800);
    await setPrice(canvas, RELEASES.tidal.title!, "8");
    await setPrice(canvas, RELEASES.ember.title!, "6");
    await setPrice(canvas, SHOWCASE_MERCH[0].title, "25");
  },
};
