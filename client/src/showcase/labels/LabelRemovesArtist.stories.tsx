import type { Meta, StoryObj } from "@storybook/react";
import { userEvent, within } from "@storybook/test";
import { http, HttpResponse } from "msw";
import LabelPage from "pages/account/label/Index";
import type { LabelRemovalImpact } from "queries";
import { reactRouterParameters } from "storybook-addon-remix-react-router";

import { USER_EXAMPLE } from "../../../test/mocks";
import { SHOWCASE_LABEL } from "../money/moneyFixtures";
import { RELEASES, SHOWCASE_ARTIST } from "../shared/fixtures";
import { pause, recordingViewport, scrollToElement } from "../shared/helpers";

const LABEL_PROFILE = SHOWCASE_LABEL.labelUser.artists![0];

const LABEL_USER: LoggedInUser = {
  ...USER_EXAMPLE,
  id: SHOWCASE_LABEL.labelUserId,
  name: "Driftwood Records",
  email: "hello@driftwood.example",
  isLabelAccount: true,
  artists: [LABEL_PROFILE],
};

const ROSTER = [
  {
    ...SHOWCASE_LABEL,
    artistId: SHOWCASE_ARTIST.id,
    artist: {
      ...SHOWCASE_ARTIST,
      _count: { trackGroups: Object.keys(RELEASES).length },
    },
  },
];

const IMPACT: LabelRemovalImpact = {
  trackGroups: Object.values(RELEASES).map(({ id, title }) => ({
    id,
    title: title ?? "",
  })),
  isArtistPayee: true,
  activeSubscriptionCount: 1,
  newPayeeName: SHOWCASE_ARTIST.name,
};

let roster = ROSTER;

const handlers = [
  http.get("*/auth/profile", () => HttpResponse.json({ result: LABEL_USER })),
  http.get("*/v1/manage/label/", () => HttpResponse.json({ results: roster })),
  http.get("*/v1/manage/artists", () =>
    HttpResponse.json({ results: [LABEL_PROFILE] })
  ),
  http.get("*/v1/manage/label/artists/:artistId", () =>
    HttpResponse.json({ result: IMPACT })
  ),
  http.delete("*/v1/manage/label/artists/:artistId", () => {
    roster = [];
    return HttpResponse.json({ message: "Success" });
  }),
];

/**
 * A label removes an artist from its roster. The label sees the same impact
 * the artist would: which releases stop paying the label, and how many
 * subscriptions stay billed through its Stripe account.
 */
const meta = {
  title: "Showcase/Labels/Label removes an artist",
  component: LabelPage,
  parameters: {
    layout: "fullscreen",
    ...recordingViewport,
    msw: { handlers: { auth: handlers } },
    reactRouter: reactRouterParameters({
      location: { path: "/account/label" },
      routing: { path: "/account/label" },
    }),
  },
  beforeEach: () => {
    roster = ROSTER;
  },
} satisfies Meta<typeof LabelPage>;

export default meta;
type Story = StoryObj<typeof meta>;

const openRemoveModal = async (canvasElement: HTMLElement) => {
  const canvas = within(canvasElement);
  const button = await canvas.findByRole(
    "button",
    { name: "Remove" },
    { timeout: 10000 }
  );
  await scrollToElement(button, 360);
  await pause(700);
  await userEvent.click(button);
  const body = within(canvasElement.ownerDocument.body);
  await body.findByText(`Remove ${SHOWCASE_ARTIST.name} from your roster?`);
  await body.findByText(/1 active subscription/);
  return body;
};

/** The label is the artist's payee: every release and 1 subscription. */
export const RemoveFromRoster: Story = {
  play: async ({ canvasElement }) => {
    await openRemoveModal(canvasElement);
  },
};

/** Confirms; the artist leaves the roster. */
export const ConfirmRemoval: Story = {
  play: async ({ canvasElement }) => {
    const body = await openRemoveModal(canvasElement);
    await pause(1200);
    await userEvent.click(body.getByRole("button", { name: "Remove artist" }));
    await body.findByText(`${SHOWCASE_ARTIST.name} removed from your roster`);
  },
};
